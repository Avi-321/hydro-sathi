import "dotenv/config";

const num = (v, d) => (v === undefined || v === "" ? d : Number(v));

export const config = {
  port: num(process.env.PORT, 4000),
  env: process.env.NODE_ENV ?? "development",
  corsOrigin: (process.env.CORS_ORIGIN ?? "http://localhost:8080").split(",").map((s) => s.trim()),
  db: {
    host: process.env.DB_HOST ?? "127.0.0.1",
    port: num(process.env.DB_PORT, 3306),
    user: process.env.DB_USER ?? "root",
    password: process.env.DB_PASSWORD ?? "",
    database: process.env.DB_NAME ?? "hydro_sathi",
    connectionLimit: num(process.env.DB_CONNECTION_LIMIT, 10),
  },
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET ?? "dev-access-secret",
    refreshPepper: process.env.JWT_REFRESH_PEPPER ?? "dev-refresh-pepper",
    accessTtl: process.env.ACCESS_TOKEN_TTL ?? "15m",
    refreshDays: num(process.env.REFRESH_TOKEN_TTL_DAYS, 30),
  },
  uploads: {
    dir: process.env.UPLOAD_DIR ?? "uploads",
    publicBaseUrl: process.env.PUBLIC_BASE_URL ?? "http://localhost:4000",
  },
  esewa: {
    merchantCode: process.env.ESEWA_MERCHANT_CODE ?? "EPAYTEST",
    secretKey: process.env.ESEWA_SECRET_KEY ?? "8gBm/:&EnhH.1/q",
    formUrl: process.env.ESEWA_FORM_URL ?? "https://rc-epay.esewa.com.np/api/epay/main/v2/form",
    statusUrl: process.env.ESEWA_STATUS_URL ?? "https://rc.esewa.com.np/api/epay/transaction/status/",
  },
  khalti: {
    secretKey: process.env.KHALTI_SECRET_KEY ?? "",
    baseUrl: process.env.KHALTI_BASE_URL ?? "https://a.khalti.com/api/v2",
  },
  redirects: {
    success: process.env.PAYMENT_SUCCESS_URL ?? "http://localhost:8080/orders",
    failure: process.env.PAYMENT_FAILURE_URL ?? "http://localhost:8080/cart",
  },
  appUrl: process.env.APP_URL ?? "http://localhost:8080",
  mail: {
    host: process.env.SMTP_HOST ?? "smtp.gmail.com",
    port: num(process.env.SMTP_PORT, 465),
    user: process.env.SMTP_USER ?? "",
    pass: process.env.SMTP_PASS ?? "",
    from: process.env.MAIL_FROM ?? process.env.SMTP_USER ?? "no-reply@hydrosathi.com",
    fromName: process.env.MAIL_FROM_NAME ?? "Hydro Sathi",
  },
  admin: {
    email: (process.env.ADMIN_EMAIL ?? "admin@hydrosathi.com").toLowerCase(),
    password: process.env.ADMIN_PASSWORD ?? "Admin@12345",
    name: process.env.ADMIN_NAME ?? "Hydro Sathi Admin",
  },
  taxRate: 0.13,
  deliveryBase: 1200,
  deliveryHeavy: 3500,
  deliveryHeavyThreshold: 200000,
};
