import type { Request, Response, NextFunction } from "express";
import { ZodType, z } from "zod";

export const validate =
  <T>(schema: ZodType<T>) =>
  (req: Request, res: Response, next: NextFunction) => {
    // This makes sure to validate the request body against the zod schemas
    // we've defined
    const result = schema.safeParse(req.body);

    // Self explanatory, but result has a success and error property, with success being a bool
    // and error containing the error(s)

    if (!result.success) {
      // Makes the error human-readable
      const prettifiedError = z.treeifyError(result.error);

      // Returns an error response (custom so we can't use the default)
      return res
        .status(400)
        .json({ success: false, errors: prettifiedError });
    }

    // Will run the next function in the express middleware chain
    next();
  };
