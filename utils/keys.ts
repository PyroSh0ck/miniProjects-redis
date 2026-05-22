// This is a helper function for getting keys for hash data
// Most of the time, they will have prefixes (like namespaces)
// So that we can avoid naming collisions. Like so:
// miniProjects-redis:restaurants:restaurantId

export function getKeyName(...args: string[]) {
  return `miniProjects-redis:${args.join(":")}`;
}

export const restaurantKeyById = (id: string) => getKeyName("restaurants", id);
// Note that the id is going to be the restaurant id, since we want to get all the reviews per restaurant
// It will look something like this: miniProjects-redis:reviews:restaurants:[restaurantID]
export const reviewKeyById = (id: string) => getKeyName("reviews", id);
// And this one will be the review key id, so it would look something like this:
// miniProjects-redis:review_details:reviews:restaurants:[restaurantID]
// Note that both this and reviewKey will return a list, not an individual review
export const reviewDetailsKeyById = (id: string) =>
  getKeyName("review_details", id);

// These are the helper functions for each of the 3 sets
export const cuisinesKey = getKeyName("cuisines");
export const cuisineKey = (name: string) => getKeyName("cuisine", name);
export const restaurantCuisinesKeyById = (id: string) =>
  getKeyName("restaurant_cuisine", id);

// This is the helper function for sorted sets:
export const restaurantByRatingkey = getKeyName("restaurants_by_rating");
