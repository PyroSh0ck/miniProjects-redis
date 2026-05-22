import type { Request, Response, NextFunction } from "express";
import { initializeRedisClient } from "../utils/client";
import { restaurantKeyById } from "../utils/keys";
import { errorResponse } from "../utils/responses";

// Because of a recent express update, all types sent as params will be string | string[]
// But since this is only a ts thing and not an issue to deal with at runtime,
// the function's params are explictly set to just be string
interface RestaurantRequestParams {
  restaurantId: string;
}

export const checkRestaurantExists = async (
  req: Request<RestaurantRequestParams>,
  res: Response,
  next: NextFunction,
) => {
  const { restaurantId } = req.params;

  // If the restaurantId doens't exist (null)
  if (!restaurantId) {
    return errorResponse(res, 400, "Restaurant ID not found");
  }

  // If the restaurant key doesn't exist in the database (invalid id)
  const client = await initializeRedisClient();
  const restaurantKey = restaurantKeyById(restaurantId);
  const exists = await client.exists(restaurantKey);

  if (!exists) {
    return errorResponse(res, 404, "Restaurant not found");
  }

  // Once again, continue to the next function in the middleware chain
  next();
};
