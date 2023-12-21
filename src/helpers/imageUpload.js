const multer = require("multer");

const ImageStorage = () =>
  multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, "uploads/images");
    },
    filename: (req, file, cb) => {
      cb(null, file.originalname);
    },
  });

const imageUpload = (destination) =>
  multer({
    storage: ImageStorage(destination),
    limits: {
      fieldSize: 2 * 1024 * 1024, //2mb
    },
    onError: function (err, next) {
      return console.log("error: ", err);
    },
  }).single("image");

module.exports = imageUpload;
