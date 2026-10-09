const firebase = require("firebase-admin");
const serviceAccount = require("./build-up-deb9a-firebase-adminsdk-n0d0y-a15cf778b8.json");

/**
 * Single Firebase Admin entry point for the whole server.
 *
 * Both Storage (helpers/uploadManager.js) and Cloud Messaging
 * (services/pushNotification.service.js) need an initialised app, and
 * firebase-admin throws if initializeApp() runs twice. Requiring this module
 * anywhere gives you the same already-initialised app.
 */

// Node caches modules, so this guard also covers the hot-reload case.
if (!firebase.apps.length) {
  firebase.initializeApp({
    credential: firebase.credential.cert(serviceAccount),
    databaseURL: "https://build-up-deb9a-default-rtdb.firebaseio.com",
    storageBucket: "https://build-up-deb9a.firebasestorage.app",//appspot.com",
  });
}

// Lazy: pulling in the messaging namespace eagerly would cost a few ms on every
// boot even in processes that never push anything.
const messaging = () => firebase.messaging();

module.exports = {
  firebase,
  admin: firebase.app(),
  messaging,
  storageBucket: firebase.app().options.storageBucket,
};
