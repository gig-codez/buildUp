//express
const express = require("express");
const cors = require("cors");
//database
const { default: mongoose } = require("mongoose");
require("dotenv").config();
const app = express();
const AWS = require("aws-sdk");
const upload = require("./src/helpers/documentUploader");
// Configure AWS credentials (replace with your own)
AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});
app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use("/image", express.static("./uploads"));
app.use(express.json());

//web socket server connection for chatrooms
// const io = require("socket.io");
// const users = {};
// io().on("connection", (socket) => {
//   socket.on("new-user", (name) => {
//     users[socket.id] = name;
//     socket.broadcast.emit("user-connected", name);
//   });
//   socket.on("send-chat-message", (message) => {
//     socket.broadcast.emit("chat-message", {
//       message: message,
//       name: users[socket.id],
//     });
//   });
//   socket.on("disconnect", () => {
//     socket.broadcast.emit("user-disconnected", user[socket.id]);
//     delete users[socket.id];
//   });
// });

// register routes
app.use("/get", require("./src/routes/get.routes"));
app.use("/post", require("./src/routes/post.routes"));
app.use("/delete", require("./src/routes/delete.routes"));
app.use("/update", require("./src/routes/update.routes"));
app.use("/payments", require("./src/routes/payment.routes"));

app.post("/upload", upload("photos", "docs"), function (req, res, next) {
  res.send("Successfully uploaded  ");
});

// db connection
const dbOptions = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
};

// connecting to the database
mongoose.set("strictQuery", false);
mongoose
  .connect(process.env.DB_URL, dbOptions)
  .then(() => {
    console.log("Connected to database successful\n");
  })
  .catch((err) => {
    console.error("Connection error", err);
    process.exit();
  });

// end of db connection
app.listen(4000, () => {
  console.log(`Server running on port => http://127.0.0.1:${process.env.PORT}`);
  console.table("\nWaiting for database connection");
});
