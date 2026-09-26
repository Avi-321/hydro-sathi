/**
 * Hydro Sathi API — Node.js + Express + MySQL 5.7/8 or MariaDB 10.x.
 * Start with:  cp .env.example .env && npm install && npm run dev
 */
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import path from "node:path";
import { config } from "./config.js";
import { assertDbConnection } from "./db.js";
import { ApiError } from "./lib/http.js";
import { authRouter } from "./routes/auth.js";
import { catalogueRouter } from "./routes/catalogue.js";
import { cartRouter, wishlistRouter } from "./routes/cart.js";
import { orderRouter } from "./routes/orders.js";
import { paymentRouter, webhookRouter } from "./routes/payments.js";
import { sellerRouter } from "./routes/seller.js";
import { adminRouter } from "./routes/admin.js";
import { uploadRouter } from "./routes/uploads.js";
import { supportRouter } from "./routes/support.js";
import { verifyMailer } from "./lib/mailer.js";

const app = express();
app.set("trust proxy", 1);
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(cors({ origin: config.corsOrigin, credentials: true }));
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan(config.env === "production" ? "combined" : "dev"));
app.use("/uploads", express.static(path.resolve(config.uploads.dir)));

const api = express.Router();
api.get("/health", async (_req, res) => {
  try {
    await assertDbConnection();
    res.json({ ok: true, db: "up", env: config.env });
  } catch (err) {
    res.status(503).json({ ok: false, db: "down", error: err.message });
  }
});
api.use("/auth", authRouter);
api.use("/", catalogueRouter); // /categories, /brands, /manufacturers, /products, /sellers
api.use("/cart/wishlist", wishlistRouter);
api.use("/cart", cartRouter);
api.use("/orders", orderRouter);
api.use("/payments", paymentRouter);
api.use("/webhooks", webhookRouter);
api.use("/seller", sellerRouter);
api.use("/admin", adminRouter);
api.use("/uploads", uploadRouter);
api.use("/support", supportRouter);

app.use("/api/v1", api);

app.use((_req, res) => res.status(404).json({ error: "Route not found" }));

// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  if (err instanceof ApiError) {
    return res.status(err.status).json({ error: err.message, details: err.details ?? undefined });
  }
  if (err?.code === "ER_DUP_ENTRY") return res.status(409).json({ error: "Duplicate record" });
  if (err?.type === "entity.parse.failed") return res.status(400).json({ error: "Invalid JSON body" });
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

const server = app.listen(config.port, async () => {
  try {
    await assertDbConnection();
    const mail = await verifyMailer();
    console.log(mail.ok ? "✔ SMTP ready (Gmail)" : `⚠ SMTP not ready: ${mail.reason}`);
    console.log(`✔ MySQL connected → ${config.db.user}@${config.db.host}:${config.db.port}/${config.db.database}`);
  } catch (err) {
    console.error(`✖ MySQL connection failed: ${err.message}`);
  }
  console.log(`▶ Hydro Sathi API listening on http://localhost:${config.port}/api/v1`);
});

for (const sig of ["SIGINT", "SIGTERM"]) {
  process.on(sig, () => server.close(() => process.exit(0)));
}
