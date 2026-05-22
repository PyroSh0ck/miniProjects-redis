import express from "express";
import { validate } from "../middlewares/validate.ts";
import { type Restaurant, RestaurantSchema } from "../schemas/restaurant.ts";
import { initializeRedisClient } from "../utils/client.ts";

const router = express.Router();

// Note that the post request won't go through until its been validated
router.post("/", validate(RestaurantSchema), async (req, res) => {
  const data = req.body as Restaurant;
  const client = await initializeRedisClient();

  res.send("Hello World!");
});

export default router;
