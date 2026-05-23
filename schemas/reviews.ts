import { z } from "zod";

// Same situation as the schema for restaurant.ts
// It reduces redundancy and allows for easy validation
// like the .min(1).max(5)

export const ReviewSchema = z.object({
  review: z.string().min(1),
  rating: z.number().min(1).max(5),
});

// Makes sure its a regular ts type and not something
// thats typeof z.Object({review: z.String()}) etc

export type Review = z.infer<typeof ReviewSchema>;
