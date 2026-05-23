import { SchemaFieldTypes } from "redis";
import { initializeRedisClient } from "../utils/client.js";
import { indexKey, getKeyName } from "../utils/keys.js";

async function createIndex() {
  // Pretty typical setup
  const client = await initializeRedisClient();

  // Since this script is only going to be run one time
  // we want to overwrite any of the previous indexes
  // that are using this key. Hence, we'll use a try-catch
  // loop, that will attempt to drop the index if it exists
  try {
    await client.ft.dropIndex(indexKey);
  } catch (err) {
    console.log("No existing index to delete");
  }

  // Now its time to create le new index :D
  // Note that the second argument is the Redis search schema
  // With the first object being the fields we want to search
  // through. The bigger this is though, the slower it'll be
  // since Redis will recalc the index on every update. The 
  // second object is for us to tell Redis where to look
  // like the hashes, the sets, etc
  await client.ft.create(indexKey, {
    {
      id: {
        type: SchemaFieldTypes.TEXT,
        AS: "id",
        // You could optionally write SORTABLE here
      },
      name: {
        type: SchemaFieldTypes.TEXT,
        AS: "name"
      },
      avgStars: {
        type: SchemaFieldTypes.NUMERIC,
        AS: "avgStars",
        SORTABLE: true
      }
    }, {
      ON: "HASH",
      // Since this is specifically the index for restaurants
      PREFIX: getKeyName("restaurants")
    }
  });
}

// We have to actually run the function then exit the file
await createIndex();
process.exit()
