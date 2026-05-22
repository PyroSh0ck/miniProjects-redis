// This is the entry point for express.
// We also allow the app to use the express json middleware
import express from "express";

const PORT = process.env.PORT || 3000;
const app = express();
app.use(express.json());

app
  .listen(PORT, () => {
    console.log(`Application running on port: ${PORT}`);
  })
  .on("error", (error) => {
    throw new Error(error.message);
  });
