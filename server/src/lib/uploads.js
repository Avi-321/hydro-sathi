/**
 * Shared file-upload plumbing (real file uploads — never URLs).
 * Files are written to `config.uploads.dir` and served from
 * `${PUBLIC_BASE_URL}/uploads/<file>` by the static handler in index.js.
 */
import fs from "node:fs";
import path from "node:path";
import multer from "multer";
import { config } from "../config.js";

fs.mkdirSync(config.uploads.dir, { recursive: true });

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const DOC_TYPES = [...IMAGE_TYPES, "application/pdf"];

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, config.uploads.dir),
  filename: (_req, file, cb) =>
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${path.extname(file.originalname).toLowerCase()}`),
});

const make = (types, mb) =>
  multer({
    storage,
    limits: { fileSize: mb * 1024 * 1024 },
    fileFilter: (_req, file, cb) =>
      types.includes(file.mimetype) ? cb(null, true) : cb(new Error(`Unsupported file type: ${file.mimetype}`)),
  });

/** Images only (product photos, seller logos) — 5 MB each. */
export const imageUpload = make(IMAGE_TYPES, 5);
/** Images + PDF (verification documents) — 5 MB each. */
export const documentUpload = make(DOC_TYPES, 5);

/** Public URL for a stored file. */
export const fileUrl = (file) => `${config.uploads.publicBaseUrl}/uploads/${file.filename}`;
