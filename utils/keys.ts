// This is a helper function for getting keys for hash data
// Most of the time, they will have prefixes (like namespaces)
// So that we can avoid naming collisions. Like so:
// miniProjects-redis:restaurants:restaurantId

export function getKeyName(...args: string[]) {
  return `miniProjects-redis:${args.join(":")}`;
}

export const restaurantKeyById = (id: string) => getKeyName("restaurants", id);
