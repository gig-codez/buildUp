//express
const express = require("express");
const cors = require("cors");
//database
const { default: mongoose } = require("mongoose");
require("dotenv").config();
const app = express();
const WebSocketServer = require("websocket").server;
const wssRoutes = require("./src/routes/websocket.routes");
const {
  connWaitingArea,
  addressUserIdMapping,
  connAcceptedArea,
} = require("./src/global");


app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// register routes 
app.use("/get", require("./src/routes/get.routes"));
app.use("/post", require("./src/routes/post.routes"));
app.use("/delete", require("./src/routes/delete.routes"));
app.use("/update", require("./src/routes/update.routes"));
app.use("/payments", require("./src/routes/payment.routes"));
app.use("/portfolio", require("./src/routes/portfolio.routes"));
app.use("/admin", require("./src/routes/admin.routes"));
app.use("/search", require("./src/routes/search.routes"));


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
    console.clear();
    console.log("Connected to database successfully\n");
  })
  .catch((err) => {
    console.error("Connection error", err);
    process.exit();
  });

// end of db connection
const httpServer = app.listen(4000, () => {
  console.log(`Server running on port => http://127.0.0.1:${process.env.PORT}`);
  console.table("\nWaiting for database connection");
});

//webserver connections
wsServer = new WebSocketServer({
  httpServer: httpServer,
  // You should not use autoAcceptConnections for production
  // applications, as it defeats all standard cross-origin protection
  // facilities built into the protocol and the browser.  You should
  // *always* verify the connection's origin and decide whether or not
  // to accept it.
  autoAcceptConnections: false,
});

function originIsAllowed(origin) {
  // put logic here to detect whether the specified origin is allowed.
  return true;
}

wsServer.on("request", function (request) {
  if (!originIsAllowed(request.origin)) {
    // Make sure we only accept requests from an allowed origin
    request.reject();
    console.log(
      new Date() + " Connection from origin " + request.origin + " rejected."
    );
    return;
  }

  const connection = request.accept("", request.origin);
  connWaitingArea[connection.remoteAddress.toString()] = connection;
  connection.sendUTF(JSON.stringify({status: 200, request:{referrer: "init"}}));
  // console.log((new Date()) + ' Connection accepted.');
  connection.on("message", function (message) {
    if (message.type === "utf8") {
      try {
        const json = JSON.parse(message.utf8Data.toString());
        const refString = 'referrer';
        const keys = [refString,'data'];
        for(let key of keys){
          if(!json.hasOwnProperty(key)){
            connection.sendUTF(JSON.stringify({error: "Invalid data format", status: 400, data: json}));
            return;
          }
        }
        //find ways of catching this error and remove code below
        if(wssRoutes.hasOwnProperty(json[refString])){
          wssRoutes[json[refString]](json, connection);
          // if(typeof(func)==="function"){
          //   func(json, connection);
            return;
          // }
        }
        connection.sendUTF(JSON.stringify({error: "Not found", status: 404, data: json}));
      }
      catch (e) {
        connection.sendUTF(JSON.stringify({error: "Invalid data format", status: 400, data: message.toString()}));
        console.log(e)
      }
      // console.log('Received Message: ' + message.utf8Data.toString());
      // connection.sendUTF(message.utf8Data);
    } else if (message.type === "binary") {
      console.log(
        "Received Binary Message of " + message.binaryData.length + " bytes"
      );
      connection.sendBytes("message");
    }
  });

  connection.on("close", function (reasonCode, description) {
    let remAddress = connection.remoteAddress.toString();
    if (connWaitingArea.hasOwnProperty(remAddress)) {
      delete connWaitingArea[remAddress];
    } else if (addressUserIdMapping.hasOwnProperty(remAddress)) {
      const userId = addressUserIdMapping[remAddress];
      delete connAcceptedArea[userId][remAddress];
      (() => {
        for (const x in connAcceptedArea[userId]) {
          return;
        }
        delete connAcceptedArea[userId];
      })();
      delete addressUserIdMapping[remAddress];
    }
    console.log(
      new Date() + " Peer " + connection.remoteAddress + " disconnected."
    );
  });
});
