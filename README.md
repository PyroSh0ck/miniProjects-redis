# This is a basic project that utilizes Redis, Express, and Zod

This app uses modular routing, which means all the routes are in
separate files/modules, with each of them handling a specific
endpoint.

## File Structure Breakdown

This section will explain a little bit about the file structure of the
project, so that I remember where to check for debugging.

### Index.ts

This is the root file, also known as the entry point,
and its where we initialize all of the express configurations.
We create the app, mount the endpoints, and mount the middlewares

### Routes

This folder will contain all of the API Route handlers for top level
endpoints (such as /restaurants or /cuisines). Each of these files
will return a express router object and an app.use() will be added
to the index.ts for each one.

### Utils

This contains various important helper functions, such as response.ts,
which has functions for returning default error or success responses
from any HTTP handlers, client.ts, which returns (or initializes if necessary)
the Redis client, and keys.ts, which allows for quick key generation from
a set of variables.

### Schemas

This contains all the of the Zod schemas for HTTP bodies, and they're going
to be used for validation before request handling.

### Middlewares

These contain middlewares that intercept requests, such as the errorhandler
and the validate.ts (which validates the body against a generic Zod schema,
which in of itself is referenced in each HTTP request that utilizes the
body).

## Redis Notes

### Hashes

These are going to be field-value pairs, which represent basic objects & counters.
However, they cannot hold nested data (such as nested arrays/objects) and fields
can be added and removed as needed (meaning there is no schema). So this project
will be storing basic restaurant information by hashing. The id would be the key,
and an object containing basic information would be the value.

For future reference, there are also some useful functions to remember:

- HSET - sets the value of one or more fields in a hash.
- HGET - returns the value at a given field
- HGETALL - returns all fields and values of the hash stored at key.
- HMGET - returns the values at one or more given fields
- HINCRBY - increments the value at a given field by the integer provided.

### Lists

Lists are simply just a linked list of string values, which are optimized for
adding/removing a head or a tail. For example, lets say you have a list of reviews.
You can get the newest or the top 5 newest results very quickly, much faster than
if you had some kind of array.

For future ref, here are some list commands (just like hashes):

- LPUSH/RPUSH - add to head/tail
- LPOP/RPOP - remove (and return) from head/tail
- LLEN - returns length
- LMOVE - moves from one list to another
- LRANGE - extracts a range of elements
- LTRIM - reduces a list to a specified range
