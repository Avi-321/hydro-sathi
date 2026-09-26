import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Check, Circle } from "lucide-react";
import { SiteLayout } from "@/components/hs/SiteLayout";
import { EmptyState, LoadingGrid } from "@/components/hs/StateBlocks";
import { StatusBadge } from "@/components/hs/StatusBadge";
import { Button } from "@/components/ui/button";
import { orderApi } from "@/lib/api";
import { NPR, formatDate, titleCase } from "@/lib/format";
import { useAppState } from "@/lib/store";
import { ORDER_FLOW, type Order } from "@/lib/types";

export const Route = createFileRoute("/orders")({
  head: () => ({
    meta: [
      { title: "My Orders & Tracking | Hydro Sathi" },
      {
        name: "description",
        content: "Track hydropower spare part orders from payment confirmation through admin approval to delivery.",
      },
      { property: "og:title", content: "My Orders & Tracking | Hydro Sathi" },
      { property: "og:description", content: "Order timeline, payment status and shipment tracking." },
    ],
  }),
  component: OrdersPage,
});

function Timeline({ order }: { order: Order }) {
  const currentIndex = ORDER_FLOW.indexOf(order.orderStatus);
  return (
    <ol className="mt-4 grid gap-2 sm:grid-cols-4 lg:grid-cols-8">
      {ORDER_FLOW.map((status, i) => {
        const done = i <= currentIndex;
        return (
          <li key={status} className="flex items-start gap-2 text-xs">
            {done ? (
              <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" />
            ) : (
              <Circle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            )}
            <span className={done ? "font-medium" : "text-muted-foreground"}>{titleCase(status)}</span>
          </li>
        );
      })}
    </ol>
  );
}

function OrdersPage() {
  const { user } = useAppState();
  const { data: orders, isLoading } = useQuery({ queryKey: ["orders", "buyer"], queryFn: orderApi.listBuyerOrders });

  return (
    <SiteLayout crumbs={[{ label: "My orders" }]}>
      <div className="mx-auto max-w-[1400px] px-4 py-8">
        <h1 className="section-title text-2xl">My orders</h1>

        {!user ? (
          <div className="mt-6">
            <EmptyState
              title="Sign in to view your orders"
              description="Order history and tracking are available to signed-in buyers only."
              action={
                <Button asChild className="rounded-none">
                  <Link to="/signin">Sign in</Link>
                </Button>
              }
            />
          </div>
        ) : isLoading ? (
          <div className="mt-6">
            <LoadingGrid count={3} />
          </div>
        ) : (orders?.length ?? 0) === 0 ? (
          <div className="mt-6">
            <EmptyState title="No orders yet" description="Your placed orders will appear here." />
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            {orders!.map((o) => (
              <article key={o.id} className="border border-border bg-card p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="font-display text-lg font-bold">{o.orderNumber}</h2>
                    <p className="text-xs text-muted-foreground">
                      Placed {formatDate(o.createdAt)} · {o.items.length} item(s) · {o.paymentProvider}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={o.paymentStatus} />
                    <StatusBadge status={o.orderStatus} />
                    <span className="font-display text-lg font-bold">{NPR(o.totalAmount)}</span>
                  </div>
                </div>

                <ul className="mt-3 divide-y divide-border border-y border-border">
                  {o.items.map((i) => (
                    <li key={i.id} className="flex flex-wrap justify-between gap-2 py-2 text-sm">
                      <span>
                        {i.productNameSnapshot}
                        <span className="part-no ml-2 text-muted-foreground">{i.partNumberSnapshot}</span>
                        <span className="block text-xs text-muted-foreground">Seller: {i.sellerNameSnapshot}</span>
                      </span>
                      <span>
                        {i.quantity} × {NPR(i.unitPrice)}
                      </span>
                    </li>
                  ))}
                </ul>

                <Timeline order={o} />

                {o.trackingNumber && (
                  <p className="mt-3 text-xs text-muted-foreground">
                    Shipment: {o.courierName} · Tracking <span className="part-no">{o.trackingNumber}</span>
                  </p>
                )}
                <p className="mt-2 text-xs text-muted-foreground">
                  Delivery to {o.shippingAddress.city}, {o.shippingAddress.district}, {o.shippingAddress.province}
                </p>
              </article>
            ))}
          </div>
        )}
      </div>
    </SiteLayout>
  );
}
