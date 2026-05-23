// This is the entry point for express.
// We also allow the app to use the express json middleware
import express from "express";

// Each of these modules export a express router
import restaurantsRouter from "./routes/restaurants.ts";
import cuisinesRouter from "./routes/cuisines.ts";

// This module is for error handling
import { errorHandler } from "./middlewares/errorHandler.ts";

const PORT = process.env.PORT || 3000;
const app = express();
app.use(express.json());

// Adding the exported routers from restaurants and cuisines to these specific endpoints
app.use("/restaurants", restaurantsRouter);
app.use("/cuisines", cuisinesRouter);

// Make sure that our app uses the middleware we define for our error handler
app.use(errorHandler);
app
  .listen(PORT, () => {
    console.log(`Application running on port: ${PORT}`);
  })
  .on("error", (error) => {
    throw new Error(error.message);
  });
