/**
 * Hydro Sathi API service layer — talks to the Node.js + Express + MySQL
 * backend in `server/` (base URL from VITE_API_BASE_URL).
 *
 * Every screen talks ONLY to this module. Backend rows (snake_case) are
 * mapped here into the shared domain types in `./types`.
 */
import { api, request, tokenStore } from "./http";
import type {
  Brand,
  CartItem,
  CartTotals,
  CatalogueItem,
  Category,
  ListingCondition,
  Manufacturer,
  NotificationItem,
  Order,
  OrderItem,
  Paginated,
  Product,
  ProductQuery,
  Seller,
  SellerListing,
  SettlementRecord,
} from "./types";

export { API_BASE_URL } from "./http";
export const http = request;

type Row = Record<string, any>;

const num = (v: unknown, d = 0) => (v === null || v === undefined || v === "" ? d : Number(v));
const str = (v: unknown, d = "") => (v === null || v === undefined ? d : String(v));
const parseJson = <T>(v: unknown, fallback: T): T => {
  if (v === null || v === undefined) return fallback;
  if (typeof v === "string") {
    try {
      return JSON.parse(v) as T;
    } catch {
      return fallback;
    }
  }
  return v as T;
};

/** Cache of seller id -> business name, filled as catalogue data arrives. */
const sellerNames = new Map<number, string>();

/** Display name for a seller id (falls back while the name is still loading). */
export function sellerName(sellerId: number): string {
  return sellerNames.get(sellerId) ?? "Verified seller";
}

/* --------------------------------- Mappers --------------------------------- */

function mapCategory(row: Row): Category {
  return {
    id: num(row["id"]),
    parentId: row["parent_id"] ? num(row["parent_id"]) : null,
    name: str(row["name"]),
    slug: str(row["slug"]),
    description: str(row["description"]),
    sortOrder: num(row["sort_order"]),
    status: row["is_active"] ? "ACTIVE" : "INACTIVE",
    children: Array.isArray(row["children"]) ? row["children"].map(mapCategory) : [],
  };
}

function mapProduct(row: Row): Product {
  const images = parseJson<Row[]>(row["images"], []) ?? [];
  return {
    id: num(row["id"]),
    categoryId: num(row["category_id"]),
    subcategoryId: null,
    brandId: row["brand_id"] ? num(row["brand_id"]) : null,
    manufacturerId: null,
    name: str(row["name"]),
    slug: str(row["slug"]),
    sku: str(row["part_number"]),
    partNumber: str(row["part_number"]),
    oemNumber: str(row["oem_number"]),
    shortDescription: str(row["short_description"]),
    description: str(row["description"]),
    manufacturer: str(row["manufacturer"]),
    unit: str(row["unit"], "pcs"),
    hsCode: str(row["hs_code"]),
    ...(row["weight_kg"] ? { weightKg: num(row["weight_kg"]) } : {}),
    specifications: parseJson<Record<string, string>>(row["specifications"], {}) ?? {},
    compatibility: parseJson<string[]>(row["compatibility"], []) ?? [],
    images: (images.filter(Boolean) as Row[]).map((img, i) => ({
      id: i + 1,
      productId: num(row["id"]),
      imageUrl: str(img["url"]),
      altText: str(img["alt"], str(row["name"])),
      sortOrder: i,
      isPrimary: Boolean(img["isPrimary"]),
    })),
    status: (str(row["status"], "ACTIVE") as Product["status"]) ?? "ACTIVE",
    isFeatured: Boolean(Number(row["is_featured"] ?? 0)),
    isNewArrival: Boolean(Number(row["is_new_arrival"] ?? 0)),
    createdBySellerId: row["created_by_seller_id"] ? num(row["created_by_seller_id"]) : null,
    submittedBySeller: row["submitted_by_seller"] ? str(row["submitted_by_seller"]) : null,
    rejectionReason: row["rejection_reason"] ? str(row["rejection_reason"]) : null,
    createdAt: str(row["created_at"], new Date().toISOString()),
  };
}

function mapListingJson(row: Row, productId: number): SellerListing {
  const sid = num(row["sellerId"] ?? row["seller_id"]);
  const name = str(row["sellerName"] ?? row["seller_name"]);
  if (sid && name) sellerNames.set(sid, name);
  return {
    id: num(row["id"]),
    productId,
    sellerId: num(row["sellerId"] ?? row["seller_id"]),
    price: num(row["price"]),
    ...(row["mrp"] ? { compareAtPrice: num(row["mrp"]) } : {}),
    stockQuantity: num(row["stockQuantity"] ?? row["stock_quantity"]),
    minimumOrderQuantity: num(row["minOrderQty"] ?? row["min_order_qty"], 1),
    condition: (str(row["condition"] ?? row["condition_type"], "NEW") as ListingCondition) ?? "NEW",
    leadTimeDays: num(row["leadTimeDays"] ?? row["lead_time_days"], 3),
    status: "ACTIVE",
    approvalStatus: "APPROVED",
    createdAt: str(row["created_at"], new Date().toISOString()),
  };
}

function mapCatalogueItem(row: Row): CatalogueItem {
  const product = mapProduct(row);
  const rawListings = (parseJson<Row[]>(row["listings"], []) ?? []).filter(Boolean);
  const listings = rawListings.map((l) => mapListingJson(l, product.id)).sort((a, b) => a.price - b.price);
  const best = listings.find((l) => l.stockQuantity > 0) ?? listings[0] ?? null;
  const bestRaw = rawListings.find((l) => num(l["id"]) === best?.id);
  return {
    product,
    listings,
    bestListing: best,
    categoryName: str(row["category_name"], "Uncategorised"),
    brandName: str(row["brand_name"]),
    manufacturerName: str(row["manufacturer"]),
    sellerName: str(bestRaw?.["sellerName"]),
  };
}

function mapOrderItem(row: Row): OrderItem {
  return {
    id: num(row["id"]),
    productId: num(row["product_id"]),
    listingId: num(row["listing_id"]),
    sellerId: num(row["seller_id"]),
    productNameSnapshot: str(row["product_name_snapshot"] ?? row["name"]),
    partNumberSnapshot: str(row["part_number_snapshot"] ?? row["partNumber"]),
    sellerNameSnapshot: str(row["seller_name_snapshot"]),
    quantity: num(row["quantity"]),
    unitPrice: num(row["unit_price"] ?? row["unitPrice"]),
    subtotal: num(row["subtotal"], num(row["unit_price"]) * num(row["quantity"])),
    commissionRate: num(row["commission_rate"] ?? row["commissionRate"]),
    commissionAmount: num(row["commission_amount"]),
    sellerAmount: num(row["seller_amount"] ?? row["sellerAmount"]),
  };
}

function mapOrder(row: Row): Order {
  const items = (parseJson<Row[]>(row["items"], []) ?? []).filter(Boolean).map(mapOrderItem);
  const history = (parseJson<Row[]>(row["history"], []) ?? []).filter(Boolean).map((h) => ({
    status: str(h["status"]) as Order["orderStatus"],
    at: str(h["created_at"]),
    note: str(h["note"]),
  }));
  return {
    id: num(row["id"]),
    orderNumber: str(row["order_number"]),
    userId: num(row["user_id"]),
    buyerName: str(row["buyer_name"]),
    items,
    shippingAddress: {
      fullName: str(row["buyer_name"]),
      phone: str(row["buyer_phone"]),
      addressLine1: str(row["shipping_street"]),
      addressLine2: str(row["shipping_landmark"]),
      province: str(row["shipping_province"]),
      district: str(row["shipping_district"]),
      city: str(row["shipping_city"]),
    },
    subtotal: num(row["subtotal"]),
    deliveryCharge: num(row["delivery_charge"]),
    taxAmount: num(row["tax_amount"]),
    discountAmount: num(row["discount_amount"]),
    commissionAmount: num(row["commission_amount"]),
    totalAmount: num(row["total_amount"], num(row["seller_gross"])),
    currency: "NPR",
    paymentProvider: (str(row["payment_provider"], "ESEWA") as Order["paymentProvider"]) ?? "ESEWA",
    paymentStatus: (str(row["payment_status"], "PENDING") as Order["paymentStatus"]) ?? "PENDING",
    orderStatus: (str(row["order_status"], "PLACED") as Order["orderStatus"]) ?? "PLACED",
    trackingNumber: str(row["tracking_number"]),
    courierName: str(row["courier_name"]),
    createdAt: str(row["created_at"]),
    history,
  };
}

function mapSeller(row: Row): Seller {
  const sid = Number(row["id"]);
  const bn = String(row["business_name"] ?? row["businessName"] ?? "");
  if (sid && bn) sellerNames.set(sid, bn);
  return {
    id: num(row["id"]),
    userId: num(row["user_id"]),
    businessName: str(row["business_name"]),
    businessType: str(row["business_type"], "Supplier"),
    registrationNumber: str(row["registration_number"]),
    panNumber: str(row["pan_number"]),
    description: str(row["description"]),
    address: str(row["address_line"]),
    province: str(row["province"]),
    district: str(row["district"]),
    city: str(row["city"]),
    approvalStatus: (str(row["approval_status"], "PENDING") as Seller["approvalStatus"]) ?? "PENDING",
    commissionRate: num(row["commission_rate"]),
    rating: num(row["rating"]),
    totalProducts: num(row["listing_count"]),
    createdAt: str(row["created_at"]),
  };
}

function mapSettlement(row: Row): SettlementRecord {
  return {
    id: num(row["id"]),
    sellerId: num(row["seller_id"]),
    orderNumber: str(row["order_number"]),
    grossAmount: num(row["gross_amount"]),
    commissionAmount: num(row["commission_amount"]),
    refundAmount: num(row["refund_amount"]),
    netAmount: num(row["net_amount"]),
    status: (str(row["status"], "PENDING") as SettlementRecord["status"]) ?? "PENDING",
    createdAt: str(row["created_at"]),
  };
}

function mapNotification(row: Row): NotificationItem {
  return {
    id: num(row["id"]),
    type: str(row["type"]),
    title: str(row["title"]),
    message: str(row["message"]),
    isRead: Boolean(row["is_read"]),
    createdAt: str(row["created_at"]),
  };
}

/* -------------------------------- Catalogue -------------------------------- */

export const catalogueApi = {
  listCategories: async (): Promise<Category[]> =>
    (await api.get<{ data: Row[] }>("/categories", undefined, false)).data.map(mapCategory),

  listBrands: async (): Promise<Brand[]> =>
    (await api.get<{ data: Row[] }>("/brands", undefined, false)).data.map((b) => ({
      id: num(b["id"]),
      name: str(b["name"]),
      slug: str(b["slug"]),
    })),

  listManufacturers: async (): Promise<Manufacturer[]> =>
    (await api.get<{ data: Row[] }>("/manufacturers", undefined, false)).data.map((m, i) => ({
      id: i + 1,
      name: str(m["name"]),
      slug: str(m["name"]).toLowerCase().replace(/\s+/g, "-"),
    })),

  listSellers: async (): Promise<Seller[]> =>
    (await api.get<{ data: Row[] }>("/sellers", undefined, false)).data.map(mapSeller),

  searchProducts: async (q: ProductQuery = {}): Promise<Paginated<CatalogueItem>> => {
    const res = await api.get<{ data: Row[]; page: number; pageSize: number; total: number; totalPages: number }>(
      "/products",
      {
        q: q.q,
        categorySlug: q.subcategorySlug ?? q.categorySlug,
        brandId: q.brandIds?.[0],
        sellerId: q.sellerIds?.[0],
        condition: q.conditions?.[0],
        inStockOnly: q.inStockOnly ? "true" : undefined,
        minPrice: q.minPrice,
        maxPrice: q.maxPrice,
        sort: q.sort,
        page: q.page ?? 1,
        pageSize: q.pageSize ?? 9,
      },
      false,
    );
    return {
      data: res.data.map(mapCatalogueItem),
      page: res.page,
      pageSize: res.pageSize,
      total: res.total,
      totalPages: res.totalPages,
    };
  },

  getProductBySlug: async (slug: string): Promise<CatalogueItem | null> => {
    try {
      const res = await api.get<{ data: Row }>(`/products/${encodeURIComponent(slug)}`, undefined, false);
      return mapCatalogueItem(res.data);
    } catch {
      return null;
    }
  },

  getSellerBySlug: async (slug: string) => api.get<{ seller: Row; listings: Row[] }>(`/sellers/${slug}`, undefined, false),
};

/* ------------------------------ Cart & wishlist ----------------------------- */

export interface ServerCart {
  items: CartItem[];
  totals: CartTotals;
}

const mapCartItem = (row: Row): CartItem => ({
  listingId: num(row["listing_id"]),
  productId: num(row["product_id"]),
  quantity: num(row["quantity"]),
  unitPrice: num(row["unit_price"]),
  productName: str(row["product_name"]),
  partNumber: str(row["part_number"]),
  sellerId: num(row["seller_id"]),
  sellerName: str(row["seller_name"]),
  imageUrl: str(row["image_url"]),
  stockQuantity: num(row["stock_quantity"]),
});

export const cartApi = {
  get: async (): Promise<ServerCart> => {
    const res = await api.get<{ items: Row[]; totals: CartTotals }>("/cart");
    return { items: res.items.map(mapCartItem), totals: res.totals };
  },
  add: (listingId: number, quantity = 1) => api.post<{ ok: true }>("/cart/items", { listingId, quantity }),
  update: (listingId: number, quantity: number) => api.patch<{ ok: true }>(`/cart/items/${listingId}`, { quantity }),
  remove: (listingId: number) => api.del<{ ok: true }>(`/cart/items/${listingId}`),
  clear: () => api.del<{ ok: true }>("/cart"),
  wishlist: async (): Promise<Row[]> => (await api.get<{ data: Row[] }>("/cart/wishlist")).data,
  addWish: (productId: number) => api.post<{ ok: true }>(`/cart/wishlist/${productId}`),
  removeWish: (productId: number) => api.del<{ ok: true }>(`/cart/wishlist/${productId}`),
};

/* --------------------------------- Totals ---------------------------------- */

export const TAX_RATE = 0.13;
export const DELIVERY_BASE = 1200;

/** Preview only — the backend recomputes every value at checkout. */
export function computeTotals(items: CartItem[]): CartTotals {
  const subtotal = items.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
  const deliveryCharge = subtotal === 0 ? 0 : subtotal > 200000 ? 3500 : DELIVERY_BASE;
  const taxAmount = Math.round(subtotal * TAX_RATE * 100) / 100;
  return { subtotal, deliveryCharge, taxAmount, discountAmount: 0, grandTotal: subtotal + deliveryCharge + taxAmount };
}

/* --------------------------------- Orders ---------------------------------- */

export interface CreateOrderPayload {
  shipping: {
    buyerName: string;
    buyerPhone: string;
    buyerEmail: string;
    province: string;
    district: string;
    city: string;
    street: string;
    landmark?: string;
  };
  paymentProvider: "ESEWA" | "KHALTI" | "COD" | "BANK_TRANSFER";
  notes?: string;
}

export const orderApi = {
  listBuyerOrders: async (): Promise<Order[]> => (await api.get<{ data: Row[] }>("/orders")).data.map(mapOrder),

  getOrder: async (orderNumber: string): Promise<Order | undefined> => {
    try {
      return mapOrder((await api.get<{ data: Row }>(`/orders/${orderNumber}`)).data);
    } catch {
      return undefined;
    }
  },

  listSellerOrders: async (): Promise<Order[]> => (await api.get<{ data: Row[] }>("/seller/orders")).data.map(mapOrder),

  listAllOrders: async (): Promise<Order[]> => (await api.get<{ data: Row[] }>("/admin/orders")).data.map(mapOrder),

  createOrder: (payload: CreateOrderPayload) =>
    api.post<{ orderId: number; orderNumber: string; totalAmount: number }>("/orders", payload),

  cancel: (orderNumber: string, reason?: string) => api.post<{ ok: true }>(`/orders/${orderNumber}/cancel`, { reason }),

  requestRefund: (orderNumber: string, amount: number, reason: string) =>
    api.post<{ ok: true }>(`/orders/${orderNumber}/refund-request`, { amount, reason }),
};

/* -------------------------------- Payments ---------------------------------- */

export interface PaymentInitiation {
  provider: string;
  formUrl?: string;
  fields?: Record<string, string>;
  paymentUrl?: string;
  pidx?: string;
  status?: string;
}

export const paymentApi = {
  initiate: (orderNumber: string, provider: CreateOrderPayload["paymentProvider"]) =>
    api.post<PaymentInitiation>("/payments/initiate", { orderNumber, provider }),
  verify: (payload: Record<string, unknown>) => api.post<{ ok: boolean; status: string }>("/payments/verify", payload),
};

/* --------------------------------- Uploads ---------------------------------- */

export interface UploadedFile {
  url: string;
  name: string;
}

export const uploadApi = {
  /** Upload real image files; returns their public URLs. */
  images: async (files: File[]): Promise<UploadedFile[]> => {
    const fd = new FormData();
    files.forEach((f) => fd.append("files", f));
    const res = await api.upload<{ data: Row[] }>("/uploads/images", fd);
    return res.data.map((f) => ({ url: str(f["url"]), name: str(f["name"]) }));
  },

  /** Verification document uploaded during seller registration (before sign-in). */
  sellerDocument: (uploadToken: string, documentType: string, file: File) => {
    const fd = new FormData();
    fd.append("uploadToken", uploadToken);
    fd.append("documentType", documentType);
    fd.append("file", file);
    return request<{ id: number; fileUrl: string }>("/uploads/seller-documents", { method: "POST", formData: fd, auth: false });
  },
};

/* -------------------------------- Support ----------------------------------- */

export interface SupportTicketInput {
  name: string;
  email: string;
  phone?: string;
  category: string;
  subject: string;
  message: string;
  orderNumber?: string;
}

export const supportApi = {
  submit: (payload: SupportTicketInput) =>
    api.post<{ ok: true; ticketNumber: string; emailSent: boolean }>("/support", payload, Boolean(tokenStore.access)),
  mine: async (): Promise<Row[]> => (await api.get<{ data: Row[] }>("/support/mine")).data,
};

/* --------------------------------- Seller ----------------------------------- */

export interface SellerDocument {
  id: number;
  documentType: string;
  fileName: string;
  fileUrl: string;
  status: string;
  createdAt: string;
}

export interface SellerStats {
  orders_count: number;
  gross_revenue: number;
  commission_paid: number;
  net_revenue: number;
  pending_items: number;
  pending_payout: number;
  listings: number;
  out_of_stock: number;
  pending_approval: number;
  monthly: { month: string; gross: number; net: number }[];
}

export const sellerApi = {
  getProfile: async (): Promise<Seller | undefined> => {
    try {
      const res = await api.get<{ seller: Row; documents: Row[] }>("/seller/profile");
      return mapSeller(res.seller ?? res);
    } catch {
      return undefined;
    }
  },

  getProfileWithDocuments: async (): Promise<{ seller: Seller | null; documents: SellerDocument[] }> => {
    try {
      const res = await api.get<{ seller: Row; documents: Row[] }>("/seller/profile");
      return {
        seller: res.seller ? mapSeller(res.seller) : null,
        documents: (res.documents ?? []).map((d) => ({
          id: num(d["id"]),
          documentType: str(d["document_type"]),
          fileName: str(d["file_name"]),
          fileUrl: str(d["file_url"]),
          status: str(d["verification_status"] ?? d["status"], "PENDING"),
          createdAt: str(d["created_at"]),
        })),
      };
    } catch {
      return { seller: null, documents: [] };
    }
  },

  updateProfile: (payload: Record<string, unknown>) => api.patch<{ ok: true }>("/seller/profile", payload),

  listListings: async (): Promise<{ listing: SellerListing; product: Product }[]> => {
    const res = await api.get<{ data: Row[] }>("/seller/listings");
    return res.data.map((row) => ({
      listing: {
        id: num(row["id"]),
        productId: num(row["product_id"]),
        sellerId: num(row["seller_id"]),
        sellerSku: str(row["sku"]),
        price: num(row["price"]),
        ...(row["mrp"] ? { compareAtPrice: num(row["mrp"]) } : {}),
        stockQuantity: num(row["stock_quantity"]),
        minimumOrderQuantity: num(row["min_order_qty"], 1),
        condition: (str(row["condition_type"], "NEW") as ListingCondition) ?? "NEW",
        leadTimeDays: num(row["lead_time_days"], 3),
        status: row["is_active"] ? "ACTIVE" : "INACTIVE",
        approvalStatus: (str(row["approval_status"], "PENDING_REVIEW") as SellerListing["approvalStatus"]) ?? "PENDING_REVIEW",
        createdAt: str(row["created_at"]),
      },
      product: {
        ...mapProduct({ id: row["product_id"], name: row["product_name"], slug: row["product_slug"], part_number: row["part_number"], oem_number: row["oem_number"] }),
        images: row["image_url"]
          ? [
              {
                id: 1,
                productId: num(row["product_id"]),
                imageUrl: str(row["image_url"]),
                altText: str(row["product_name"]),
                sortOrder: 0,
                isPrimary: true,
              },
            ]
          : [],
      },
    }));
  },

  /** Create a master product with uploaded image files — admin approval required. */
  createProduct: (fields: Record<string, string | number>, images: File[]) => {
    const fd = new FormData();
    Object.entries(fields).forEach(([k, v]) => fd.append(k, String(v)));
    images.forEach((f) => fd.append("images", f));
    return api.upload<{ productId: number; listingId: number; status: string }>("/seller/products", fd);
  },

  /** Edit a product this shop submitted (optionally adding new image files) — goes back to admin review. */
  updateProduct: (id: number, fields: Record<string, string | number>, images: File[] = []) => {
    const fd = new FormData();
    Object.entries(fields).forEach(([k, v]) => fd.append(k, String(v)));
    images.forEach((f) => fd.append("images", f));
    return api.uploadPatch<{ ok: true; status: string }>(`/seller/products/${id}`, fd);
  },
  deleteProduct: (id: number) => api.del<{ ok: true }>(`/seller/products/${id}`),

  listSubmittedProducts: async (): Promise<Row[]> => (await api.get<{ data: Row[] }>("/seller/products")).data,

  createListing: (payload: Record<string, unknown>) =>
    api.post<{ id: number; approvalStatus: string }>("/seller/listings", payload),
  updateListing: (id: number, payload: Record<string, unknown>) => api.patch<{ ok: true }>(`/seller/listings/${id}`, payload),
  deleteListing: (id: number) => api.del<{ ok: true }>(`/seller/listings/${id}`),

  listSettlements: async (): Promise<SettlementRecord[]> =>
    (await api.get<{ data: Row[] }>("/seller/settlements")).data.map(mapSettlement),

  stats: () => api.get<SellerStats>("/seller/stats"),

  listNotifications: async (): Promise<NotificationItem[]> =>
    (await api.get<{ data: Row[] }>("/seller/notifications")).data.map(mapNotification),

  updateOrderItem: (id: number, status: "CONFIRMED" | "UNAVAILABLE" | "SHIPPED" | "DELIVERED") =>
    api.patch<{ ok: true }>(`/seller/order-items/${id}`, { status }),

  uploadDocument: (documentType: string, documentNumber: string, file: File) => {
    const fd = new FormData();
    fd.append("documentType", documentType);
    fd.append("documentNumber", documentNumber);
    fd.append("file", file);
    return api.upload<{ id: number }>("/seller/documents", fd);
  },
};

/* ---------------------------------- Admin ------------------------------------ */

export interface AdminStats {
  totalBuyers: number;
  totalSellers: number;
  pendingSellers: number;
  totalProducts: number;
  pendingProducts: number;
  pendingListings: number;
  totalOrders: number;
  pendingOrders: number;
  revenue: number;
  commission: number;
  pendingSettlements: number;
  refundRequests: number;
  monthly: { month: string; revenue: number; commission: number }[];
}

export const adminApi = {
  stats: async (): Promise<AdminStats> => {
    const r = await api.get<Row>("/admin/stats");
    return {
      totalBuyers: num(r["buyers"]),
      totalSellers: num(r["sellers"]?.["total"]),
      pendingSellers: num(r["sellers"]?.["pending"]),
      totalProducts: num(r["products"]?.["total"]),
      pendingProducts: num(r["products"]?.["pending"]),
      pendingListings: num(r["listings"]?.["pending"]),
      totalOrders: num(r["orders"]?.["total"]),
      pendingOrders: num(r["orders"]?.["open"]),
      revenue: num(r["orders"]?.["revenue"]),
      commission: num(r["orders"]?.["commission"]),
      pendingSettlements: num(r["pending_settlements"]),
      refundRequests: num(r["open_refunds"]),
      monthly: (r["monthly"] ?? []).map((m: Row) => ({
        month: str(m["month"]),
        revenue: num(m["revenue"]),
        commission: num(m["commission"]),
      })),
    };
  },

  listNotifications: async (): Promise<NotificationItem[]> =>
    (await api.get<{ data: Row[] }>("/admin/notifications")).data.map(mapNotification),

  listSellers: async (): Promise<Seller[]> => (await api.get<{ data: Row[] }>("/admin/sellers")).data.map(mapSeller),
  getSeller: (id: number) => api.get<{ data: Row }>(`/admin/sellers/${id}`),
  updateSellerApproval: (id: number, status: string, reason?: string) =>
    api.patch<{ ok: true }>(`/admin/sellers/${id}/approval`, { status, reason }),
  reviewDocument: (id: number, status: "VERIFIED" | "REJECTED" | "PENDING", reason?: string) =>
    api.patch<{ ok: true }>(`/admin/seller-documents/${id}`, { status, reason }),

  listProducts: async (status?: string): Promise<Product[]> =>
    (await api.get<{ data: Row[] }>("/admin/products", { status })).data.map(mapProduct),
  createProduct: (payload: Record<string, unknown>) => api.post<{ id: number }>("/admin/products", payload),
  updateProduct: (id: number, payload: Record<string, unknown>) => api.patch<{ ok: true }>(`/admin/products/${id}`, payload),
  deleteProduct: (id: number) => api.del<{ ok: true }>(`/admin/products/${id}`),
  /** Upload real product image files (no URLs). */
  uploadProductImages: (id: number, files: File[]) => {
    const fd = new FormData();
    files.forEach((f) => fd.append("files", f));
    return api.upload<{ data: Row[] }>(`/admin/products/${id}/images`, fd);
  },
  reviewProduct: (id: number, status: "APPROVED" | "REJECTED", reason?: string) =>
    api.patch<{ ok: true }>(`/admin/products/${id}/approval`, { status, reason }),
  assignProduct: (id: number, payload: Record<string, unknown>) =>
    api.post<{ id: number }>(`/admin/products/${id}/assign`, payload),

  listSupportTickets: async (status?: string): Promise<Row[]> =>
    (await api.get<{ data: Row[] }>("/admin/support-tickets", { status })).data,
  updateSupportTicket: (id: number, payload: { status?: string; reply?: string }) =>
    api.patch<{ ok: true; emailSent: boolean }>(`/admin/support-tickets/${id}`, payload),

  listListings: (status = "PENDING_REVIEW") => api.get<{ data: Row[] }>("/admin/listings", { status }),
  reviewListing: (id: number, status: "APPROVED" | "REJECTED", reason?: string) =>
    api.patch<{ ok: true }>(`/admin/listings/${id}/approval`, { status, reason }),

  listCategories: async (): Promise<Category[]> =>
    (await api.get<{ data: Row[] }>("/categories", undefined, false)).data.map(mapCategory),
  createCategory: (payload: Record<string, unknown>) => api.post<{ id: number }>("/admin/categories", payload),
  updateCategory: (id: number, payload: Record<string, unknown>) => api.patch<{ ok: true }>(`/admin/categories/${id}`, payload),
  deleteCategory: (id: number) => api.del<{ ok: true }>(`/admin/categories/${id}`),

  updateOrderStatus: (orderNumber: string, payload: Record<string, unknown>) =>
    api.patch<{ ok: true }>(`/admin/orders/${orderNumber}/status`, payload),

  listPayments: () => api.get<{ data: Row[] }>("/admin/payments"),
  verifyPayment: (id: number) => api.patch<{ ok: true }>(`/admin/payments/${id}/verify`, {}),
  listRefunds: () => api.get<{ data: Row[] }>("/admin/refunds"),
  reviewRefund: (id: number, status: string, note?: string) => api.patch<{ ok: true }>(`/admin/refunds/${id}`, { status, note }),

  listSettlements: async (): Promise<SettlementRecord[]> =>
    (await api.get<{ data: Row[] }>("/admin/settlements")).data.map(mapSettlement),
  updateSettlement: (id: number, payload: Record<string, unknown>) => api.patch<{ ok: true }>(`/admin/settlements/${id}`, payload),

  listCommissionSettings: () => api.get<{ data: Row[] }>("/admin/commission-settings"),
  createCommissionSetting: (payload: Record<string, unknown>) => api.post<{ id: number }>("/admin/commission-settings", payload),
  listCommissionRecords: () => api.get<{ data: Row[] }>("/admin/commission-records"),

  listAuditLogs: () => api.get<{ data: Row[] }>("/admin/audit-logs"),
  listUsers: () => api.get<{ data: Row[] }>("/admin/users"),
  updateUserStatus: (id: number, status: string) => api.patch<{ ok: true }>(`/admin/users/${id}/status`, { status }),
};
