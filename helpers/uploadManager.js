const multer = require("multer");

// Uploads are buffered in memory, then persisted to local disk by
// helpers/file_helper.js once the controller decides where they belong.
// This keeps folder organization (e.g. per-supplier) in controller logic
// instead of multer config.
const uploaderManager = () => {
  return multer({
    storage: multer.memoryStorage(),
  });
};

module.exports = uploaderManager;
