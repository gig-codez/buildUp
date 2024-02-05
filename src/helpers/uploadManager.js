const multer = require("multer");
const firebase = require("firebase-admin");
const serviceAccount =  require("./samba-stats-firebase-adminsdk-8jaaw-7b37d3ce3a.json");
// Initialize Firebase
firebase.initializeApp({
  credential: firebase.credential.cert(serviceAccount),
  databaseURL: "https://samba-stats-default-rtdb.firebaseio.com",
  storageBucket: "samba-stats.appspot.com",
});
const uploaderManager = (field, multiple) => {
  return multiple === false
    ? multer({
        storage: multer.memoryStorage(),
      }).single(field)
    : multer({
         storage: multer.memoryStorage(),
      }).array(field);
};

module.exports = uploaderManager;
