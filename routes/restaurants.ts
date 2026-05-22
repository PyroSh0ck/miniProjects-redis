import express, { type Request } from "express";
import { validate } from "../middlewares/validate";
import { type Restaurant, RestaurantSchema } from "../schemas/restaurant";
import { initializeRedisClient } from "../utils/client";
import { nanoid } from "nanoid";
import { restaurantKeyById } from "../utils/keys";
import { successResponse } from "../utils/responses";
import { checkRestaurantExists } from "../middlewares/checkRestaurantId";

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
