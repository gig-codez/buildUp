//express
const express = require("express");
const cors = require("cors");
//database
const { default: mongoose } = require("mongoose");
require("dotenv").config();
const app = express();
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
app.use("/payment", require("./src/routes/payment_routes"));

// db connection
const dbOptions = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
};

console.log("All good");

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
