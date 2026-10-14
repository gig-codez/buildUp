const multer = require("multer");
// Firebase is initialised once in helpers/firebaseAdmin.js — requiring it here
// guarantees we reuse that app rather than racing to call initializeApp() twice.
require("./firebaseAdmin");

const uploaderManager = () => {
  return multer({
    storage: multer.memoryStorage(),
  });
};

module.exports = uploaderManager;
