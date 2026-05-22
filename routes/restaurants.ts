import express, { type Request } from "express";
import { validate } from "../middlewares/validate.js";
import { type Restaurant, RestaurantSchema } from "../schemas/restaurant.js";
import { type Review, ReviewSchema } from "../schemas/reviews.js";
import { initializeRedisClient } from "../utils/client.js";
import { nanoid } from "nanoid";
import {
  restaurantKeyById,
  reviewDetailsKeyById,
  reviewKeyById,
} from "../utils/keys.js";
import { successResponse } from "../utils/responses.js";
import { checkRestaurantExists } from "../middlewares/checkRestaurantId.js";

const router = express.Router();

// Note that the post request won't go through until its been validated
router.post("/", validate(RestaurantSchema), async (req, res, next) => {
  const data = req.body as Restaurant;
  try {
    const client = await initializeRedisClient();

    // This is just a lib for strong id generation
    const id = nanoid();

    // Now that we have the id, we can get the key
    const restaurantKey = restaurantKeyById(id);

    // The object that we're going to hash
    const hashData = { id, name: data.name, location: data.location };

    // Adding the restaurant key and its hash to redis field-value pair
    // addResult will be the number of new fields added
    const addResult = await client.hSet(restaurantKey, hashData);
    console.log(`Number of fields added: ${addResult}`);

    // Return a success (with the hash data in case you want to use it in the frontend)
    return successResponse(res, hashData, "Added new restaurant");
  } catch (err) {
    // Will send the error to the next function in the middleware chain in Express
    next(err);
  }
});

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
      await Promise.all([
        client.lPush(reviewKey, reviewId),
        client.hSet(reviewDetailsKey, reviewData),
      ]);

      // Returns response like normal :D
      return successResponse(res, reviewData, "Review successfully added!");
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
      const [viewCount, restaurant] = await Promise.all([
        client.hIncrBy(restaurantKey, "viewCount", 1),
        client.hGetAll(restaurantKey),
      ]);

      // Currently, even if the id doesn't exist, we'll return a success response
      // We don't want that, however we aren't going to bloat this function with
      // error checking. Instead, we'll leave that for the middleware
      return successResponse(res, restaurant);
    } catch (err) {
      next(err);
    }
  },
);

export default router;
