const express = require("express");
const { default: mongoose } = require("mongoose");
require("dotenv").config();
const app = express();
app.use(express.urlencoded({ extended: true }));
app.use("/image", express.static("./uploads"));
app.use(express.json());

// register routes
app.use("/get", require("./src/routes/get.routes"));
app.use("/post", require("./src/routes/post.routes"));
app.use("/delete", require("./src/routes/delete.routes"));
app.use("/update", require("./src/routes/update.routes"));

// db connection
const dbOptions = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
};

// connecting to the database
mongoose.set("strictQuery", false);
mongoose.connect(process.env.DB_URL, dbOptions)
  .then(() => {
    console.log("Connected to db");
  })
  .catch((err) => {
    console.error("Connection error", err);
    process.exit();
  });
  // end of db connection
app.listen(4000, () => {
  console.log(`Server running on port => http://127.0.0.1:${process.env.PORT}`);
});
