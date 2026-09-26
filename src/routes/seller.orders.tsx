import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { PortalLayout, SELLER_NAV } from "@/components/hs/PortalLayout";
import { StatusBadge } from "@/components/hs/StatusBadge";
import { Button } from "@/components/ui/button";
import { orderApi } from "@/lib/api";
import { NPR, formatDate } from "@/lib/format";

export const Route = createFileRoute("/seller/orders")({
  head: () => ({
    meta: [
      { title: "Seller Orders | Hydro Sathi" },
      { name: "description", content: "Confirm availability for orders containing your parts and follow their status." },
      { property: "og:title", content: "Seller Orders | Hydro Sathi" },
      { property: "og:description", content: "Seller order workflow and confirmations." },
    ],
  }),
  component: SellerOrders,
});


function SellerOrders() {
  const { user } = useAuth();
  const sellerId = user?.sellerId ?? 0;
  const { data: orders = [] } = useQuery({
    queryKey: ["seller", "orders", sellerId],
    queryFn: () => orderApi.listSellerOrders(),
  });

  return (
    <PortalLayout
      title="Orders"
      subtitle="Only orders containing your listings are visible"
      badge="Seller portal"
      nav={SELLER_NAV}
    >
      <div className="space-y-4">
        {orders.map((o) => {
          const items = o.items.filter((i) => i.sellerId === sellerId);
          const gross = items.reduce((s, i) => s + i.subtotal, 0);
          const commission = items.reduce((s, i) => s + i.commissionAmount, 0);
          return (
            <article key={o.id} className="border border-border bg-card p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-display text-lg font-bold">{o.orderNumber}</h2>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(o.createdAt)} · Ship to {o.shippingAddress.city}, {o.shippingAddress.district}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={o.paymentStatus} />
                  <StatusBadge status={o.orderStatus} />
                </div>
              </div>

              <ul className="mt-3 divide-y divide-border border-y border-border text-sm">
                {items.map((i) => (
                  <li key={i.id} className="flex flex-wrap justify-between gap-2 py-2">
                    <span>
                      {i.productNameSnapshot}
                      <span className="part-no ml-2 text-muted-foreground">{i.partNumberSnapshot}</span>
                    </span>
                    <span>
                      {i.quantity} × {NPR(i.unitPrice)}
                    </span>
                  </li>
                ))}
              </ul>

              <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
                <div className="flex justify-between border border-border p-2">
                  <dt className="text-muted-foreground">Gross</dt>
                  <dd>{NPR(gross)}</dd>
                </div>
                <div className="flex justify-between border border-border p-2">
                  <dt className="text-muted-foreground">Commission</dt>
                  <dd>−{NPR(commission)}</dd>
                </div>
                <div className="flex justify-between border border-border bg-secondary p-2 font-semibold">
                  <dt>Your net</dt>
                  <dd>{NPR(gross - commission)}</dd>
                </div>
              </dl>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Button
                  className="rounded-none"
                  disabled={o.orderStatus !== "SELLER_PENDING_CONFIRMATION"}
                  onClick={() => toast.success("Availability confirmed — awaiting admin approval")}
                >
                  Confirm availability
                </Button>
                <Button
                  variant="outline"
                  className="rounded-none"
                  disabled={o.orderStatus !== "SELLER_PENDING_CONFIRMATION"}
                  onClick={() => toast.message("Reported as unavailable — admin will review")}
                >
                  Report unavailable
                </Button>
                <span className="text-xs text-muted-foreground">
                  Final shipping approval is issued by Hydro Sathi admin.
                </span>
              </div>
            </article>
          );
        })}
      </div>
    </PortalLayout>
  );
}
