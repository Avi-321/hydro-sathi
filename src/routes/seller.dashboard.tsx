import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { PortalLayout, SELLER_NAV } from "@/components/hs/PortalLayout";
import { StatusBadge } from "@/components/hs/StatusBadge";
import { orderApi, sellerApi } from "@/lib/api";
import { NPR, formatDate } from "@/lib/format";

export const Route = createFileRoute("/seller/dashboard")({
  head: () => ({
    meta: [
      { title: "Seller Dashboard | Hydro Sathi" },
      { name: "description", content: "Sales, commission, net revenue and pending orders for Hydro Sathi sellers." },
      { property: "og:title", content: "Seller Dashboard | Hydro Sathi" },
      { property: "og:description", content: "Seller performance overview." },
    ],
  }),
  component: SellerDashboard,
});


function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="border border-border bg-card p-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-2xl font-bold">{value}</p>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function SellerDashboard() {
  const { user } = useAuth();
  const sellerId = user?.sellerId ?? 0;
  const { data: orders = [] } = useQuery({
    queryKey: ["seller", "orders", sellerId],
    queryFn: () => orderApi.listSellerOrders(),
  });
  const { data: listings = [] } = useQuery({
    queryKey: ["seller", "listings", sellerId],
    queryFn: () => sellerApi.listListings(),
  });
  const { data: settlements = [] } = useQuery({
    queryKey: ["seller", "settlements", sellerId],
    queryFn: () => sellerApi.listSettlements(),
  });

  const myItems = orders.flatMap((o) => o.items.filter((i) => i.sellerId === sellerId));
  const gross = myItems.reduce((s, i) => s + i.subtotal, 0);
  const commission = myItems.reduce((s, i) => s + i.commissionAmount, 0);
  const lowStock = listings.filter((l) => l.listing.stockQuantity > 0 && l.listing.stockQuantity <= 5);

  return (
    <PortalLayout title="Seller dashboard" subtitle="Himalaya Hydro Traders" badge="Seller portal" nav={SELLER_NAV}>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Gross revenue" value={NPR(gross)} hint="Product value across orders" />
        <Stat label="Hydro Sathi commission" value={NPR(commission)} hint="Snapshotted per order item" />
        <Stat label="Net revenue" value={NPR(gross - commission)} hint="Payable to you" />
        <Stat label="Pending settlement" value={NPR(settlements.filter((s) => s.status !== "PAID").reduce((s, r) => s + r.netAmount, 0))} />
        <Stat label="Total orders" value={String(orders.length)} />
        <Stat label="Pending orders" value={String(orders.filter((o) => o.orderStatus !== "COMPLETED").length)} />
        <Stat label="Listed products" value={String(listings.length)} />
        <Stat label="Low stock (≤5)" value={String(lowStock.length)} />
      </div>

      <section className="mt-6 border border-border bg-card">
        <h2 className="section-title border-b border-border p-4 text-sm">Recent orders</h2>
        <ul className="divide-y divide-border">
          {orders.map((o) => (
            <li key={o.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div>
                <p className="font-semibold">{o.orderNumber}</p>
                <p className="text-xs text-muted-foreground">
                  {formatDate(o.createdAt)} · {o.buyerName}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={o.paymentStatus} />
                <StatusBadge status={o.orderStatus} />
                <span className="font-semibold">
                  {NPR(o.items.filter((i) => i.sellerId === sellerId).reduce((s, i) => s + i.subtotal, 0))}
                </span>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-6 border border-border bg-card">
        <h2 className="section-title border-b border-border p-4 text-sm">Low stock alerts</h2>
        <ul className="divide-y divide-border">
          {lowStock.length === 0 && <li className="p-4 text-sm text-muted-foreground">No low stock items.</li>}
          {lowStock.map(({ listing, product }) => (
            <li key={listing.id} className="flex items-center justify-between p-4 text-sm">
              <span>
                {product.name} <span className="part-no text-muted-foreground">{product.partNumber}</span>
              </span>
              <span className="text-warning-foreground">{listing.stockQuantity} left</span>
            </li>
          ))}
        </ul>
      </section>
    </PortalLayout>
  );
}
