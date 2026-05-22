import { createClient, type RedisClientType } from "redis";

let client: RedisClientType | null = null;

export async function initializeRedisClient() {
  // We'll be using a singleton pattern
  // Which means we just want to set this up once throughout the lifetime of our application

  // If the client hasn't been setup before (i.e. the app has just been init)
  if (!client) {
    // You can run createClient({url: ...})
    // If you want a different url than localhost:6739
    // Which is the default redis port

    client = createClient();

    // If we get an error just output it
    client.on("error", (err) => {
      console.error(err);
    });

    // Once we get the connect event, output that its been connected
    client.on("connect", () => {
      console.log("Redis connected");
    });

    // But you still have to make sure the connection is fully satisifed
    await client.connect();
  }

  // If the client does already exist, just return it
  // The point of this is to make sure we don't have to
  // initialize a new client every time we want to query
  // Redis
  return client;
}
