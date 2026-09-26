/**
 * Hydro Sathi — shared TypeScript domain models.
 * These mirror the MySQL 8 schema in `db/hydro_sathi_schema.sql` and the
 * REST contracts documented in `docs/API_CONTRACTS.md`.
 */

export type UserRole = "BUYER" | "SELLER" | "ADMIN";
export type UserStatus = "ACTIVE" | "INACTIVE" | "BLOCKED";

export interface User {
  id: number;
  role: UserRole;
  fullName: string;
  email: string;
  phone: string | null;
  status: string;
  emailVerified: boolean;
  sellerId: number | null;
  sellerStatus: string | null;
  createdAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AuthSession {
  user: User;
  tokens: AuthTokens;
}

export type ApprovalStatus = "PENDING" | "APPROVED" | "REJECTED" | "SUSPENDED";

export interface Seller {
  id: number;
  userId: number;
  businessName: string;
  businessType: string;
  registrationNumber: string;
  panNumber: string;
  vatNumber?: string;
  description: string;
  address: string;
  province: string;
  district: string;
  city: string;
  approvalStatus: ApprovalStatus;
  commissionRate: number; // percentage snapshot default
  rating: number;
  totalProducts: number;
  createdAt: string;
}

export type DocumentType =
  | "BUSINESS_REGISTRATION"
  | "PAN"
  | "VAT"
  | "IDENTITY"
  | "BANK_DOCUMENT"
  | "OTHER";

export interface SellerDocument {
  id: number;
  sellerId: number;
  documentType: DocumentType;
  documentNumber: string;
  fileUrl: string;
  verificationStatus: "PENDING" | "VERIFIED" | "REJECTED";
}

export interface Category {
  id: number;
  parentId: number | null;
  name: string;
  slug: string;
  description?: string;
  sortOrder: number;
  status: "ACTIVE" | "INACTIVE";
  children?: Category[];
}

export interface Brand {
  id: number;
  name: string;
  slug: string;
}

export interface Manufacturer {
  id: number;
  name: string;
  slug: string;
  country?: string;
}

export type ProductStatus = "DRAFT" | "PENDING_REVIEW" | "ACTIVE" | "ARCHIVED";

/** MASTER PRODUCT — never carries a seller_id. */
export interface Product {
  id: number;
  categoryId: number;
  subcategoryId: number | null;
  brandId: number | null;
  manufacturerId: number | null;
  name: string;
  slug: string;
  sku: string;
  partNumber: string;
  oemNumber?: string;
  serialNumber?: string;
  productCode?: string;
  shortDescription: string;
  description: string;
  material?: string;
  manufacturer?: string;
  unit?: string;
  hsCode?: string;
  weightKg?: number | undefined;
  dimensions?: { length?: number; width?: number; height?: number };
  specifications: Record<string, string>;
  compatibility: string[];
  images: ProductImage[];
  status: ProductStatus;
  isFeatured?: boolean;
  isNewArrival?: boolean;
  createdBySellerId?: number | null;
  submittedBySeller?: string | null;
  rejectionReason?: string | null;
  createdAt: string;
}

export interface ProductImage {
  id: number;
  productId: number;
  imageUrl: string;
  altText: string;
  sortOrder: number;
  isPrimary: boolean;
}

export type ListingCondition = "NEW" | "REFURBISHED" | "USED";

/** SELLER PRODUCT LISTING — links a seller to a master product. */
export interface SellerListing {
  id: number;
  productId: number;
  sellerId: number;
  sellerSku?: string;
  price: number;
  compareAtPrice?: number | undefined;
  stockQuantity: number;
  minimumOrderQuantity: number;
  condition: ListingCondition;
  sellerDescription?: string;
  leadTimeDays: number;
  status: "ACTIVE" | "INACTIVE";
  approvalStatus: "PENDING_REVIEW" | "APPROVED" | "REJECTED";
  createdAt: string;
}

/** Denormalised read model used by catalogue screens. */
export interface CatalogueItem {
  product: Product;
  listings: SellerListing[];
  bestListing: SellerListing | null;
  categoryName: string;
  brandName?: string;
  manufacturerName?: string;
  sellerName?: string;
}

export interface CartItem {
  listingId: number;
  productId: number;
  quantity: number;
  unitPrice: number;
  productName: string;
  partNumber: string;
  sellerId: number;
  sellerName: string;
  imageUrl: string;
  stockQuantity: number;
}

export interface CartTotals {
  subtotal: number;
  deliveryCharge: number;
  taxAmount: number;
  discountAmount: number;
  grandTotal: number;
}

export type PaymentProvider = "ESEWA" | "KHALTI" | "COD" | "BANK_TRANSFER";
export type PaymentStatus = "PENDING" | "PAID" | "FAILED" | "REFUNDED" | "PARTIALLY_REFUNDED";

export type OrderStatus =
  | "PLACED"
  | "ADMIN_APPROVED"
  | "ON_HOLD"
  | "PAYMENT_CONFIRMED"
  | "SELLER_PENDING_CONFIRMATION"
  | "SELLER_CONFIRMED"
  | "ADMIN_APPROVAL"
  | "READY_FOR_SHIPPING"
  | "SHIPPED"
  | "DELIVERED"
  | "COMPLETED"
  | "CANCELLED";

export const ORDER_FLOW: OrderStatus[] = [
  "PAYMENT_CONFIRMED",
  "SELLER_PENDING_CONFIRMATION",
  "SELLER_CONFIRMED",
  "ADMIN_APPROVAL",
  "READY_FOR_SHIPPING",
  "SHIPPED",
  "DELIVERED",
  "COMPLETED",
];

export interface OrderItem {
  id: number;
  productId: number;
  listingId: number;
  sellerId: number;
  productNameSnapshot: string;
  partNumberSnapshot: string;
  sellerNameSnapshot: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  commissionRate: number;
  commissionAmount: number;
  sellerAmount: number;
}

export interface Address {
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  province: string;
  district: string;
  city: string;
  postalCode?: string;
}

export interface Order {
  id: number;
  orderNumber: string;
  userId: number;
  buyerName: string;
  items: OrderItem[];
  shippingAddress: Address;
  subtotal: number;
  deliveryCharge: number;
  taxAmount: number;
  discountAmount: number;
  commissionAmount: number;
  totalAmount: number;
  currency: "NPR";
  paymentProvider: PaymentProvider;
  paymentStatus: PaymentStatus;
  orderStatus: OrderStatus;
  trackingNumber?: string;
  courierName?: string;
  createdAt: string;
  history: { status: OrderStatus; at: string; note?: string }[];
}

export interface SettlementRecord {
  id: number;
  sellerId: number;
  orderNumber: string;
  grossAmount: number;
  commissionAmount: number;
  refundAmount: number;
  netAmount: number;
  status: "PENDING" | "PROCESSING" | "PAID" | "FAILED" | "ON_HOLD";
  createdAt: string;
}

export interface NotificationItem {
  id: number;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export interface Paginated<T> {
  data: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface ProductQuery {
  q?: string | undefined;
  categorySlug?: string | undefined;
  subcategorySlug?: string | undefined;
  brandIds?: number[] | undefined;
  manufacturerIds?: number[] | undefined;
  sellerIds?: number[] | undefined;
  conditions?: ListingCondition[] | undefined;
  inStockOnly?: boolean | undefined;
  minPrice?: number | undefined;
  maxPrice?: number | undefined;
  sort?: "relevance" | "price_asc" | "price_desc" | "newest" | undefined;
  page?: number | undefined;
  pageSize?: number | undefined;
}
