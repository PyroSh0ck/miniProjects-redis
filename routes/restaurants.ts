import express, { type Request } from "express";
import { validate } from "../middlewares/validate.js";
import {
  type Restaurant,
  RestaurantSchema,
  type RestaurantDetails,
  RestaurantDetailsSchema,
} from "../schemas/restaurant.js";
import { type Review, ReviewSchema } from "../schemas/reviews.js";
import { initializeRedisClient } from "../utils/client.js";
import { nanoid } from "nanoid";
import {
  cuisineKey,
  cuisinesKey,
  restaurantCuisinesKeyById,
  restaurantKeyById,
  reviewDetailsKeyById,
  reviewKeyById,
  restaurantByRatingKey,
  weatherKeyById,
  restaurantDetailsKeyById,
  indexKey,
  bloomKey,
} from "../utils/keys.js";
import { errorResponse, successResponse } from "../utils/responses.js";
import { checkRestaurantExists } from "../middlewares/checkRestaurantId.js";

const router = express.Router();

router.get("/", async (req, res, next) => {
  const { page = 1, limit = 10 } = req.query; // query params are the same as normal: ?page=2&limit=30

  // Pretty standard for range functions (see the range on lists)
  const start = (Number(page) - 1) * Number(limit);
  const end = start + Number(limit) - 1;

  try {
    const client = await initializeRedisClient();

    // gets all restaurant ids in a range, sorted by their rating, in reverse (so largest first)
    const restaurantIds = await client.zRange(
      restaurantByRatingKey,
      start,
      end,
      {
        REV: true,
      },
    );

    // Then this is pretty standard as well (from all of the other times I've done it)
    // And you just loop through all the ids and get the restaurant information
    const restaurants = await Promise.all(
      restaurantIds.map((id) => client.hGetAll(restaurantKeyById(id))),
    );

    return successResponse(res, restaurants);
  } catch (err) {
    next(err);
  }
});

// Note that the post request won't go through until its been validated
router.post("/", validate(RestaurantSchema), async (req, res, next) => {
  const data = req.body as Restaurant;
  try {
    const client = await initializeRedisClient();

    // This is just a lib for strong id generation
    const id = nanoid();

    // Now that we have the id, we can get the key
    const restaurantKey = restaurantKeyById(id);

    // This is just for determining whether there is already
    // a restaurant with the same name/location as the one
    // you're trying to create
    const bloomString = `${data.name}:${data.location}`;
    const seenBefore = client.bf.exists(bloomKey, bloomString);

    // if one existe then error :(
    if (seenBefore) {
      return errorResponse(res, 409, "Restaurant already exists");
    }
    // The object that we're going to hash
    const hashData = { id, name: data.name, location: data.location };

    // Adding the restaurant key and its hash to redis field-value pair
    // Now we're also going to add to each of the 3 sets containing our cuisines
    // The first one is just going to be a set of all the cuisines we have
    // The second one is going to be all the restaurants of a certain cuisine
    // The third one is going to be all the cuisines in a certain restaurant
    await Promise.all([
      ...data.cuisines.map((cuisine) =>
        Promise.all([
          client.sAdd(cuisinesKey, cuisine),
          client.sAdd(cuisineKey(cuisine), id),
          client.sAdd(restaurantCuisinesKeyById(id), cuisine),
        ]),
      ),
      // And then we finally add the restaurant key and its hash (not saving the cuisines here ofc)
      client.hSet(restaurantKey, hashData),

      // Adding the restaurant's rating to the sorted set
      client.zAdd(restaurantByRatingKey, {
        score: 0,
        value: id,
      }),

      client.bf.add(bloomKey, bloomString);
    ]);

    // Return a success (with the hash data in case you want to use it in the frontend)
    return successResponse(res, hashData, "Added new restaurant");
  } catch (err) {
    // Will send the error to the next function in the middleware chain in Express
    next(err);
  }
});

router.get("/search", async (req, res, next) => {
  const { name } = req.query; // gettin all the query params
  try {
    const client = await initializeRedisClient();
    const results = await client.ft.search(indexKey, `@name:${name}`);
    return successResponse(res, results);
  } catch (err) {
    next(err);
  }
});
router.post(
  "/:restaurantId/details",
  checkRestaurantExists,
  validate(RestaurantDetailsSchema),
  async (req: Request<{ restaurantId: string }>, res, next) => {
    const { restaurantId } = req.params;
    const data = req.body as RestaurantDetails;
    try {
      const client = await initializeRedisClient();
      const restaurantDetailsKey = restaurantDetailsKeyById(restaurantId);

      // The second argument is the path, and the path right now
      // is the root, but if you wanted to, you could set a
      // particular property in the JSON tree
      // For example, you could set
      // $.links.somethingelse
      await client.json.set(restaurantDetailsKey, ".", data);
      return successResponse(res, {}, "Restaurant details added!");
    } catch (err) {
      next(err);
    }
  },
);

router.get(
  "/:restaurantId/details",
  checkRestaurantExists,
  async (req: Request<{ restaurantId: string }>, res, next) => {
    const { restaurantId } = req.params;
    try {
      const client = await initializeRedisClient();
      const restaurantDetailsKey = restaurantDetailsKeyById(restaurantId);

      // You can add a second argument, which is the path like I mentioned before
      // which would look something like this: json.get(..., { path: $.links.smth })
      const details = await client.json.get(restaurantDetailsKey);
      return successResponse(res, details);
    } catch (err) {
      next(err);
    }
  },
);
router.get(
  "/:restaurantId/weather",
  checkRestaurantExists,
  async (req: Request<{ restaurantId: string }>, res, next) => {
    const { restaurantId } = req.params;

    try {
      // Typical setup
      const client = await initializeRedisClient();
      const weatherKey = weatherKeyById(restaurantId);

      // This is checking to see whether the weather
      // data has already been cached or not
      const cachedWeather = await client.get(weatherKey);

      // if it is cached we can just use that
      // We do have to run JSON.parse on it, since it is stored as
      // stringified JSON, and we want a JSON object
      if (cachedWeather) {
        console.log("Cache hit!");
        return successResponse(res, JSON.parse(cachedWeather));
      }

      // Otherwise, we'll need the restaurant key to get the location
      const restaurantKey = restaurantKeyById(restaurantId);
      const coordinates = await client.hGet(restaurantKey, "location");

      // Error handling for the coordinates
      if (!coordinates) {
        return errorResponse(res, 404, "Coordinates have not been found");
      }

      // This is the call to the api, there is like one more optional query
      // param, but I don't think its relevant. Also I included error handling
      // for the case where there is no API key
      const [long, lat] = coordinates.split(",");

      if (!process.env.WEATHER_API_KEY) {
        return errorResponse(res, 500, "No API key found for weather data");
      }
      const apiResponse = await fetch(
        `https://api.openweathermap.org/data/3.0/onecall?units=imperial&lat=${lat}&lon=${long}&appid=${process.env.WEATHER_API_KEY}`,
      );

      // This is for processing the result, and for adding it to
      // the Redis cache. I also added the 1 hour TTL, which is
      // added via the extra option and the EX field (expiry).
      // It takes an input of seconds in, so you'd use 60*60 =
      // 3600 seconds for an hour
      if (apiResponse.status === 200) {
        const json = await apiResponse.json();
        await client.set(weatherKey, JSON.stringify(json), {
          EX: 60 * 60,
        });
        return successResponse(res, json);
      }

      return errorResponse(res, 500, "Couldn't fetch weather information");
    } catch (err) {
      next(err);
    }
  },
);
// Express will match all of the endpoints in the order that we define them.
// So if you have something like /:restaurantId that should be at the bottom.
// For example, if you put /:restaurantId/beans, it would take "restaurantId/beans"
// as the search parameter, instead of just beans, since it would run /:restaurantId
// first.

router.post(
  "/:restaurantId/reviews",
  checkRestaurantExists,
  validate(ReviewSchema),
  async (req: Request<{ restaurantId: string }>, res, next) => {
    const { restaurantId } = req.params;
    const data = req.body as Review;

    try {
      // Basics
      const client = await initializeRedisClient();
      const reviewId = nanoid();

      // Remember that the reviewKey is based off the restaurant
      // We'll be adding to the linked list for the restaurant
      // Review details will contain all the necessary information
      const reviewKey = reviewKeyById(restaurantId);
      const reviewDetailsKey = reviewDetailsKeyById(reviewId);

      // Defined this here so it could be reused for sorted sets + cumulative star rating
      const restaurantKey = restaurantKeyById(restaurantId);

      // Data for each review, we're passing in the restaurantId as well for convenience in the future
      // Since this isn't tied to the restaurant at all currently
      const reviewData = {
        id: reviewId,
        ...data,
        timestamp: Date.now(),
        restaurantId,
      };

      // Promise.all like normal so that you can have concurrent async function calls
      // The first one adds the reviewId to the end of the linked list
      // The next one adds the hash of the reviewData to the reviewDetailsKey
      const [reviewCount, __setResult, totalStars] = await Promise.all([
        client.lPush(reviewKey, reviewId),
        client.hSet(reviewDetailsKey, reviewData),

        // Incrementing the total stars by the rating so we can easily calc the average
        client.hIncrByFloat(restaurantKey, "totalStars", data.rating),
      ]);

      // We could just do totalStars / reviewCount, however to make sure its 1 decimal place
      // You can use .toFixed to turn it into a string with 1 decimal place
      // And then cast it back into a number
      const averageRating = Number(
        (Number(totalStars) / reviewCount).toFixed(1),
      );
      await Promise.all([
        client.zAdd(restaurantByRatingKey, {
          score: averageRating,
          value: restaurantId,
        }),
        client.hSet(restaurantKey, "avgStars", averageRating),
      ]);
      // Returns response like normal :D
      return successResponse(res, reviewData, "Review successfully added!");
    } catch (err) {
      next(err);
    }
  },
);

router.get(
  "/:restaurantId/reviews",
  checkRestaurantExists,
  async (req: Request<{ restaurantId: string }>, res, next) => {
    const { restaurantId } = req.params;

    // We're going to be using pagination here to make things nicer and improve performance
    const { page = 1, limit = 10 } = req.query; // You can always add ?page=2&limit=20

    // To get the first index, you basically want the (page - 1) * 10 (since page 1 will be from 0 to 9, then page 2 will be from 10-19, etc)
    const startIndex = (Number(page) - 1) * Number(limit);
    const endIndex = startIndex + Number(limit) - 1; // So if we have 10 items per page, the 10th item is going to be 9 indexes past the first item

    try {
      // Pretty standard again
      const client = await initializeRedisClient();
      const reviewKey = reviewKeyById(restaurantId);

      // lRange is also pretty self-explanatory, note that this only stores strings
      // a linkedlist like this can't store objects
      const reviewIds = await client.lRange(reviewKey, startIndex, endIndex);

      // So we use the ids to get all of the objects via reviewDetails
      const reviews = await Promise.all(
        reviewIds.map((id) => client.hGetAll(reviewDetailsKeyById(id))),
      );

      return successResponse(res, reviews);
    } catch (err) {
      next(err);
    }
  },
);

router.delete(
  "/:restaurantId/reviews/:reviewId",
  checkRestaurantExists,
  async (
    req: Request<{ restaurantId: string; reviewId: string }>,
    res,
    next,
  ) => {
    const { restaurantId, reviewId } = req.params;

    try {
      const client = await initializeRedisClient();
      const reviewKey = reviewKeyById(restaurantId);
      const reviewDetailsKey = reviewDetailsKeyById(reviewKey);

      const [removeResult, deleteResult] = await Promise.all([
        client.lRem(reviewKey, 0, reviewId),
        client.del(reviewDetailsKey),
      ]);

      if (removeResult === 0 && deleteResult === 0) {
        return errorResponse(res, 404, "Review not found");
      }

      return successResponse(res, reviewId, "Review successfully deleted");
    } catch (err) {
      next(err);
    }
  },
);

// Note that the url would be of the form /restaurants/apo820jfsk (which is the restaurant id)
// Also the middleware file (checkRestaurantId) runs before the request handler for validation
router.get(
  "/:restaurantId",
  checkRestaurantExists,
  async (req: Request<{ restaurantId: string }>, res, next) => {
    // This is just getting the restaurantId from the url
    const { restaurantId } = req.params;

    try {
      // This is pretty standard, just connecting to redis client and getting id
      const client = await initializeRedisClient();
      const restaurantKey = restaurantKeyById(restaurantId);

      // Note that the Promise.all method allows us to execute multiple
      // async operation concurrently
      const [__viewCount, restaurant, cuisines] = await Promise.all([
        client.hIncrBy(restaurantKey, "viewCount", 1),
        client.hGetAll(restaurantKey),
        // Gets all the cuisines under that restaurant
        client.sMembers(restaurantCuisinesKeyById(restaurantId)),
      ]);

      // Currently, even if the id doesn't exist, we'll return a success response
      // We don't want that, however we aren't going to bloat this function with
      // error checking. Instead, we'll leave that for the middleware
      // Makes sure that all the cuisines are included in the response as well
      return successResponse(res, { ...restaurant, cuisines });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
