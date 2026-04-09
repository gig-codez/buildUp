const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

// Root directory where uploaded files live on the server's disk.
// Served publicly at `${PUBLIC_BASE_URL}/uploads/...` (wired in server.js).
const UPLOADS_ROOT = path.join(__dirname, "..", "uploads");

// Public URL prefix used to build the full file URL returned to clients.
// Falls back to the historical APP_HOST:PORT pattern used elsewhere in this project.
const getBaseUrl = () => {
  const explicit = process.env.PUBLIC_BASE_URL;
  if (explicit && explicit.length > 0) {
    return explicit.replace(/\/+$/, "");
  }
  const host = process.env.APP_HOST || "localhost";
  const port = process.env.PORT || "4000";
  return `http://${host}:${port}`;
};

// Strip path separators and anything that could escape the target folder.
const sanitizeName = (name) => {
  const base = path.basename(name || "file");
  return base.replace(/[^a-zA-Z0-9._-]/g, "_");
};

// Build a collision-proof filename: <timestamp>-<random>-<sanitized original>
const uniqueFilename = (originalname) => {
  const safe = sanitizeName(originalname);
  const stamp = Date.now();
  const rand = crypto.randomBytes(6).toString("hex");
  return `${stamp}-${rand}-${safe}`;
};

// Persist one multer file (memoryStorage buffer) to <UPLOADS_ROOT>/<folder>/<unique>
// Returns the public URL the client can use to fetch the file.
const writeSingleFile = (file, folder) => {
  const safeFolder = sanitizeName(folder || "misc");
  const targetDir = path.join(UPLOADS_ROOT, safeFolder);
  fs.mkdirSync(targetDir, { recursive: true });

  const filename = uniqueFilename(file.originalname);
  const targetPath = path.join(targetDir, filename);
  fs.writeFileSync(targetPath, file.buffer);

  return `${getBaseUrl()}/uploads/${safeFolder}/${filename}`;
};

/**
 * fileStorageMiddleware — despite the name, this is a plain async helper
 * (not an Express middleware). Matches the legacy Firebase implementation's
 * contract so call sites don't need to change:
 *
 *   - single file  (req.file)  → returns a string URL
 *   - many files   (req.files) → returns an array of string URLs
 *
 * Callers pass a `folder` string; files are organized as
 * `backend/uploads/<folder>/<unique-filename>` on disk.
 */
const fileStorageMiddleware = async (req, folder) => {
  if (req.file) {
    return writeSingleFile(req.file, folder);
  }

  if (req.files && req.files.length > 0) {
    return req.files.map((file) => writeSingleFile(file, folder));
  }

  return null;
};

module.exports = fileStorageMiddleware;
// Also expose as a named property so `const { fileStorageMiddleware } = require(...)`
// works (message.controller.js relies on this shape).
module.exports.fileStorageMiddleware = fileStorageMiddleware;
