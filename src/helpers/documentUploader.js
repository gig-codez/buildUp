const express = require("express");
const multer = require("multer");
const { S3Client } = require("@aws-sdk/client-s3");
const multerS3 = require("multer-s3");

const s3 = new S3Client();
const docUploader = (field, folder) => {
  return multer({
    storage: multerS3({
      s3: s3,
      bucket: "buildup-resources",
      metadata: function (req, file, cb) {
        cb(null, { fieldName: `${file.fieldname}` });
      },
      key: function (req, file, cb) {
        cb(null, `${folder}/${Date.now()}-${file.originalname}`);
      },
    }),
  }).single(field);
};

module.exports = docUploader;
