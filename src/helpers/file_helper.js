const firebase = require("firebase-admin");
/***
 * 
 */
const fileStorageMiddleware = async (req,folder) => {
        let images = [];

    if(req.file){
    
    // Upload the image to Firebase Storage
        const bucket = firebase.storage().bucket();
        const file = bucket.file(`buildUp/${folder}/${req.file.originalname}`);
         let x = req.file.originalname.split('.')
    //    console.log()
        const metadata = {
            contentType: `image/${x[x.length-1]}`,
        };
        await file.save(req.file.buffer, {
            metadata: metadata,
        });
        // get signed image url
        const imagePath = await file
            .getSignedUrl({
                action: 'read',
                expires: '03-09-3024', // Replace with an appropriate expiration date
            });
        return imagePath[0];
    } else {
        console.log("files")
        // handle uploading multiple files
   const files = await Promise.all(
        req.files.map(async (file) => {
          const bucket = await multiFileBucket(file, folder);
          const signedUrl = await bucket.getSignedUrl({
            action: 'read',
            expires: '03-09-3024',
          });
          return signedUrl[0];
        })
      );
      console.log(files); // This will now log the array of image URLs
      return files; // Retur
    }

};
   const multiFileBucket = async function(file,folder){
     // Upload the image to Firebase Storage
        const bucket = firebase.storage().bucket();
            const bucketFile = bucket.file(`buildUp/${folder}/${file.originalname}`);
            const metadata = {
                contentType: file.mimetype,
            };
           await bucketFile.save(file.buffer, {
                metadata: metadata,
            });
            return bucket;
   }

module.exports = fileStorageMiddleware;