
const path = require("path");
const fs = require("fs");
const { v4: uuidv4 } = require("uuid");

// Base upload directory — one level up from this file, into /uploads
const UPLOAD_DIR = path.join(__dirname, "..", "uploads");

// Base URL — set this in your .env as e.g. http://localhost:5000 or https://yourdomain.com
const BASE_URL = process.env.BASE_URL || "https://test-server.buildupuganda.com"; //"http://192.168.100.201:4000";

/**
 * Ensures a directory exists, creating it recursively if needed.
 */
const ensureDir = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

/**
 * Saves a single file buffer to disk and returns its public URL.
 */
const saveFile = (fileBuffer, originalName, folder) => {
  const ext = path.extname(originalName); // e.g. ".jpg"
  const uniqueName = `${uuidv4()}${ext}`;
  const folderPath = path.join(UPLOAD_DIR, folder);

  ensureDir(folderPath);

  const filePath = path.join(folderPath, uniqueName);
  fs.writeFileSync(filePath, fileBuffer);

  // Return a publicly accessible URL
  return `${BASE_URL}/uploads/${folder}/${uniqueName}`;
};

/**
 * Drop-in replacement for the Firebase fileStorageMiddleware.
 * Saves files to local disk and returns accessible URLs.
 *
 * @param {import('express').Request} req
 * @param {string} folder  - subfolder under /uploads, e.g. "supplier_stock"
 * @returns {Promise<string|string[]>}
 */
const fileStorageMiddleware = async (req, folder) => {
  if (req.file) {
    // Single file
    return saveFile(req.file.buffer, req.file.originalname, folder);
  } else if (req.files && req.files.length > 0) {
    // Multiple files
    const urls = req.files.map((file) =>
      saveFile(file.buffer, file.originalname, folder)
    );
    console.log("Uploaded files:", urls);
    return urls;
  } else {
    throw new Error("No file(s) found on request");
  }
};

module.exports = fileStorageMiddleware;
