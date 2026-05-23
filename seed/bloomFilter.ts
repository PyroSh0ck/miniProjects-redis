import { initializeRedisClient } from "../utils/client.js";
import { bloomKey } from "../utils/keys.js";

async function createBloomFilter() {
  const client = await initializeRedisClient();
  await Promise.all([
    client.del(bloomKey),
    // The second parameter is the error rate, and the third parameter is the capacity
    // Feel free to play around with these thingies
    client.bf.reserve(bloomKey, 0.0001, 1000000),
  ]);
}

await createBloomFilter();
process.exit();
