const AWS = require("aws-sdk");
class S3Folder {
  static async createFolder(bucketName, parentFolderName, newFolderName) {
    // create folder in S3 bucket

    const AWS_ACCESS_KEY_ID = "AKIATJZUUHAO2LDPNITJ";
    const AWS_SECRET_ACCESS_KEY = "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";
    const AWS_REGION = "us-east-1";

    // Configure AWS credentials (best practice: use environment variables or a secure configuration mechanism)
    // Configure AWS credentials (replace with your own)
    AWS.config.update({
      accessKeyId: AWS_ACCESS_KEY_ID,
      secretAccessKey: AWS_SECRET_ACCESS_KEY,
      region: AWS_REGION,
    });
    const s3 = new AWS.S3();
    try {
      // Construct the full path of the new folder
      const fullFolderPath = `buildUp-${parentFolderName}/${newFolderName}/`;
      console.log(`fullpath : ${fullFolderPath}`);
      // Check if the new folder already exists within the parent folder
      const folderCheckParams = {
        Bucket: bucketName,
        Prefix: fullFolderPath,
        MaxKeys: 1,
      };
      const folderExists =
        (await s3.listObjectsV2(folderCheckParams).promise()).Contents.length >
        0;

      if (!folderExists) {
        // Create the folder by uploading an empty object with the full path
        await s3
          .putObject({
            Bucket: bucketName,
            Key: fullFolderPath,
          })
          .promise();

        console.log({ message: "Folder created successfully" });
      } else {
        console.log({ message: "Folder already exists" });
      }
    } catch (err) {
      console.error(err);
      console.log({ message: "Error creating folder" });
    }
  }
  static execute(parentFolder) {
    ["docs", "photos"].forEach((x) => {
      this.createFolder("buildup-resources", parentFolder, x);
    });
  }
}
module.exports = S3Folder;
