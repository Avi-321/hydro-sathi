/**
 * Real file uploads (images and verification documents).
 * Nothing in the app accepts an image URL any more — every image is a file
 * stored on disk and served from /uploads/<filename>.
 */
import { Router } from "express";
import jwt from "jsonwebtoken";
import { pool, one } from "../db.js";
import { config } from "../config.js";
import { asyncHandler, badRequest, unauthorized } from "../lib/http.js";
import { documentUpload, fileUrl, imageUpload } from "../lib/uploads.js";
import { requireAuth } from "../middleware/auth.js";

export const uploadRouter = Router();

const DOC_TYPES = ["BUSINESS_REGISTRATION", "PAN", "VAT", "IDENTITY", "BANK_DOCUMENT", "OTHER"];

/** Short-lived token that lets a brand new seller upload documents before
 *  their email is verified (they cannot sign in yet). */
export function signSellerUploadToken(sellerId) {
  return jwt.sign({ sellerId, purpose: "seller-docs" }, config.jwt.accessSecret, {
    expiresIn: "2h",
    issuer: "hydro-sathi",
  });
}

// POST /uploads/images — admin & seller product photos. Field name: files
uploadRouter.post(
  "/images",
  requireAuth,
  imageUpload.array("files", 8),
  asyncHandler(async (req, res) => {
    if (!req.files?.length) throw badRequest("Attach at least one image (field name: files)");
    res.status(201).json({
      data: req.files.map((f) => ({ url: fileUrl(f), name: f.originalname.slice(0, 190), size: f.size })),
    });
  }),
);

// POST /uploads/seller-documents — public, guarded by the registration upload token.
uploadRouter.post(
  "/seller-documents",
  documentUpload.single("file"),
  asyncHandler(async (req, res) => {
    const raw = req.body.uploadToken ?? req.get("x-upload-token");
    if (!raw) throw unauthorized("Missing upload token");
    let payload;
    try {
      payload = jwt.verify(raw, config.jwt.accessSecret, { issuer: "hydro-sathi" });
    } catch {
      throw unauthorized("Upload link expired — sign in and upload from your seller profile");
    }
    if (payload.purpose !== "seller-docs") throw unauthorized("Invalid upload token");
    if (!req.file) throw badRequest("A file is required (field name: file)");

    const seller = await one(`SELECT id FROM sellers WHERE id = ?`, [payload.sellerId]);
    if (!seller) throw badRequest("Seller profile not found");

    const documentType = String(req.body.documentType ?? "OTHER").toUpperCase();
    if (!DOC_TYPES.includes(documentType)) throw badRequest(`documentType must be one of ${DOC_TYPES.join(", ")}`);

    const url = fileUrl(req.file);
    const [r] = await pool.execute(
      `INSERT INTO seller_documents (seller_id,document_type,file_url,file_name,mime_type,file_size) VALUES (?,?,?,?,?,?)`,
      [seller.id, documentType, url, req.file.originalname.slice(0, 190), req.file.mimetype, req.file.size],
    );
    res.status(201).json({ id: r.insertId, fileUrl: url, status: "PENDING" });
  }),
);
