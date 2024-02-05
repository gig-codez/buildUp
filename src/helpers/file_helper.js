const firebase = require("firebase-admin");
/***
 * 
 */
const fileStorageMiddleware = async (req,folder) => {
    if(req.files.length == 1){
    // Upload the image to Firebase Storage
        const bucket = firebase.storage().bucket();
        const file = bucket.file(`buildUp/${folder}/${req.file.originalname}`);
        const metadata = {
            contentType: req.file.mimetype,
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
        // handle uploading multiple files
       return  req.files.map((file)=>{
            const bucket = firebase.storage().bucket();
            const bucketFile = bucket.file(`buildUp/${folder}/${file.originalname}`);
            const metadata = {
                contentType: file.mimetype,
            };
            bucketFile.save(file.buffer, {
                metadata: metadata,
            });
            // get signed image url
            const imagePath = bucketFile
                .getSignedUrl({
                    action: 'read',
                    expires: '03-09-3024', // Replace with an appropriate expiration date
                });
            return imagePath[0];
        })
    }
   

};
export default fileStorageMiddleware;