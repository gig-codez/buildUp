const multer = require("multer");
const firebase = require("firebase-admin");
const serviceAccount = require("./build-up-deb9a-firebase-adminsdk-n0d0y-a15cf778b8.json");
// Initialize Firebase
firebase.initializeApp({
  credential: firebase.credential.cert(serviceAccount),
  databaseURL: "https://build-up-deb9a-default-rtdb.firebaseio.com",
  storageBucket: "build-up-deb9a.appspot.com",
});
const uploaderManager = () => {
  return multer({
    storage: multer.memoryStorage(),
  })
};

module.exports = uploaderManager;
