import { z } from "zod";

// Writing out schemas in zod reduce redundancy
// And they also make it easy to do validation like .email()

export const RestaurantSchema = z.object({
  name: z.string().min(1),
  location: z.string().min(1),
  cuisines: z.array(z.string().min(1)),
});

export const RestaurantDetailsSchema = z.object({
  links: z.array(
    z.object({
      name: z.string().min(1),
      url: z.string().min(1),
    }),
  ),
  contact: z.object({
    phone: z.string().min(1),
    email: z.email(),
  }),
});

// This is to make sure the type is a regular ts type
// Because otherwise, the type will be z.Object() etc
export type Restaurant = z.infer<typeof RestaurantSchema>;
export type RestaurantDetails = z.infer<typeof RestaurantDetailsSchema>;
