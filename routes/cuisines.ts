import express from "express";
import { initializeRedisClient } from "../utils/client.js";
import { cuisineKey, cuisinesKey, restaurantKeyById } from "../utils/keys.js";
import { successResponse } from "../utils/responses.js";

const router = express.Router();

router.get("/", async (__req, res, next) => {
  try {
    // Pretty standard
    const client = await initializeRedisClient();

    // Gets all the cuisines from the set
    const cuisines = await client.sMembers(cuisinesKey);

    return successResponse(res, cuisines);
  } catch (err) {
    next(err);
  }
});

router.get("/:cuisine", async (req, res, next) => {
  const { cuisine } = req.params;
  try {
    const client = await initializeRedisClient();

    // To get all the restaurant ids in the set
    const restaurantIds = await client.sMembers(cuisineKey(cuisine));

    // To get all the restaurant data
    const restaurants = await Promise.all(
      restaurantIds.map((id) => client.hGet(restaurantKeyById(id), "name")),
    );

    // And just return the restaurant data
    return successResponse(res, restaurants);
  } catch (err) {
    next(err);
  }
});
export default router;
