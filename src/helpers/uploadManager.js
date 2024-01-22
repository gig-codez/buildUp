const express = require("express");
const multer = require("multer");
const { S3Client } = require("@aws-sdk/client-s3");
const multerS3 = require("multer-s3");
const date = require("../global");

const s3 = new S3Client();
const uploaderManager = (field, folder, multiple) => {
  return multiple === false
    ? multer({
        storage: multerS3({
          s3: s3,
          bucket: "buildup-resources",
          metadata: function (req, file, cb) {
            cb(null, { fieldName: `${file.fieldname}` });
          },
          key: function (req, file, cb) {
            console.log(req.params);
            cb(
              null,
              `buildUp-${req.params.name}/${folder}/${date}-${file.originalname}`
            );
          },
        }),
      }).single(field)
    : multer({
        storage: multerS3({
          s3: s3,
          bucket: "buildup-resources",
          metadata: function (req, file, cb) {
            cb(null, { fieldName: `${file.fieldname}` });
          },
          key: function (req, file, cb) {
            console.log(req.params);
            cb(
              null,
              `buildUp-${req.params.name}/${folder}/${date}-${file.originalname}`
            );
          },
        }),
      }).array(field);
};

module.exports = uploaderManager;
