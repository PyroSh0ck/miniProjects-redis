import type { Request, Response, NextFunction } from "express";
import { errorResponse } from "../utils/responses.js";

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction,
) {
  console.log(err);
  // Using the default error response we made earlier
  errorResponse(res, 500, err);
}
