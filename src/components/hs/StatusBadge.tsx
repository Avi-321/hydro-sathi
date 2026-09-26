import { cn } from "@/lib/utils";
import { titleCase } from "@/lib/format";

type Tone = "neutral" | "success" | "warning" | "danger" | "info";

const TONE_MAP: Record<string, Tone> = {
  APPROVED: "success",
  ACTIVE: "success",
  PAID: "success",
  COMPLETED: "success",
  DELIVERED: "success",
  VERIFIED: "success",
  PENDING: "warning",
  PENDING_REVIEW: "warning",
  SELLER_PENDING_CONFIRMATION: "warning",
  ADMIN_APPROVAL: "warning",
  PROCESSING: "warning",
  ON_HOLD: "warning",
  REJECTED: "danger",
  FAILED: "danger",
  SUSPENDED: "danger",
  CANCELLED: "danger",
  REFUNDED: "danger",
  SHIPPED: "info",
  READY_FOR_SHIPPING: "info",
  SELLER_CONFIRMED: "info",
  PAYMENT_CONFIRMED: "info",
};

const TONE_CLASS: Record<Tone, string> = {
  neutral: "bg-muted text-muted-foreground",
  success: "bg-success/12 text-success border-success/30",
  warning: "bg-warning/18 text-warning-foreground border-warning/40",
  danger: "bg-destructive/12 text-destructive border-destructive/30",
  info: "bg-primary/12 text-primary border-primary/30",
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const tone = TONE_MAP[status] ?? "neutral";
  return (
    <span
      className={cn(
        "inline-flex items-center border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide",
        TONE_CLASS[tone],
        className,
      )}
    >
      {titleCase(status)}
    </span>
  );
}
