import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { ADMIN_NAV, PortalLayout } from "@/components/hs/PortalLayout";
import { StatusBadge } from "@/components/hs/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { adminApi, orderApi } from "@/lib/api";
import { NPR, formatDate, titleCase } from "@/lib/format";

export const Route = createFileRoute("/admin/orders")({
  head: () => ({
    meta: [
      { title: "Order Management | Hydro Sathi Admin" },
      { name: "description", content: "Verify payments, give final approval after seller confirmation, update tracking and handle refunds." },
      { property: "og:title", content: "Order Management | Hydro Sathi Admin" },
      { property: "og:description", content: "Full order lifecycle administration." },
    ],
  }),
  component: AdminOrders,
});

function AdminOrders() {
  const qc = useQueryClient();
  const { data: orders = [] } = useQuery({ queryKey: ["admin", "orders"], queryFn: orderApi.listAllOrders });
  const paymentsQuery = useQuery({ queryKey: ["admin", "payments"], queryFn: adminApi.listPayments });
  const payments = paymentsQuery.data?.data ?? [];
  const [tracking, setTracking] = useState<Record<string, string>>({});
  const [courier, setCourier] = useState<Record<string, string>>({});

  const fail = (e: unknown) => toast.error(e instanceof Error ? e.message : "Request failed");
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["admin", "orders"] });
    qc.invalidateQueries({ queryKey: ["admin", "payments"] });
  };

  const setStatus = useMutation({
    mutationFn: (v: { orderNumber: string; status: string; trackingNumber?: string | undefined; courierName?: string | undefined; note?: string | undefined }) => {
      const { orderNumber, ...payload } = v;
      return adminApi.updateOrderStatus(orderNumber, payload);
    },
    onSuccess: () => {
      toast.success("Order updated");
      refresh();
    },
    onError: fail,
  });

  const verifyPayment = useMutation({
    mutationFn: (id: number) => adminApi.verifyPayment(id),
    onSuccess: () => {
      toast.success("Payment marked as received");
      refresh();
    },
    onError: fail,
  });

  return (
    <PortalLayout title="Orders" subtitle="Payment verification to delivery" badge="Admin panel" nav={ADMIN_NAV}>
      <div className="space-y-4">
        {orders.map((o) => {
          const manualTxn = payments.find(
            (p: Record<string, any>) =>
              p["order_number"] === o.orderNumber &&
              ["BANK_TRANSFER", "COD"].includes(String(p["provider"])) &&
              String(p["status"]) !== "SUCCESS",
          );
          return (
            <article key={o.id} className="border border-border bg-card p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-display text-lg font-bold">{o.orderNumber}</h2>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(o.createdAt)} · {o.buyerName} · {o.paymentProvider}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={o.paymentStatus} />
                  <StatusBadge status={o.orderStatus} />
                  <span className="font-display text-lg font-bold">{NPR(o.totalAmount)}</span>
                </div>
              </div>

              <div className="mt-3 grid gap-3 lg:grid-cols-2">
                <ul className="divide-y divide-border border border-border text-sm">
                  {o.items.map((i) => (
                    <li key={i.id} className="flex flex-wrap justify-between gap-2 p-2">
                      <span>
                        {i.productNameSnapshot}
                        <span className="block text-xs text-muted-foreground">
                          {i.sellerNameSnapshot} · commission {i.commissionRate}% = {NPR(i.commissionAmount)}
                        </span>
                      </span>
                      <span>
                        {i.quantity} × {NPR(i.unitPrice)}
                      </span>
                    </li>
                  ))}
                </ul>

                <div className="border border-border p-3">
                  <h3 className="section-title text-xs">Status history</h3>
                  <ol className="mt-2 space-y-1 text-xs text-muted-foreground">
                    {o.history.map((h, idx) => (
                      <li key={`${h.status}-${idx}`}>
                        <span className="font-medium text-foreground">{titleCase(h.status)}</span> · {formatDate(h.at)}
                        {h.note ? ` · ${h.note}` : ""}
                      </li>
                    ))}
                  </ol>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                {manualTxn && (
                  <Button size="sm" className="rounded-none" onClick={() => verifyPayment.mutate(Number(manualTxn["id"]))}>
                    Verify {String(manualTxn["provider"]).toLowerCase()} payment
                  </Button>
                )}
                <Button
                  size="sm"
                  className="rounded-none"
                  onClick={() => setStatus.mutate({ orderNumber: o.orderNumber, status: "ADMIN_APPROVED", note: "Final admin approval" })}
                >
                  Final approve
                </Button>
                <Input
                  placeholder="Tracking number"
                  value={tracking[o.orderNumber] ?? ""}
                  onChange={(e) => setTracking((t) => ({ ...t, [o.orderNumber]: e.target.value }))}
                  className="h-9 w-44 rounded-none"
                />
                <Input
                  placeholder="Courier"
                  value={courier[o.orderNumber] ?? ""}
                  onChange={(e) => setCourier((t) => ({ ...t, [o.orderNumber]: e.target.value }))}
                  className="h-9 w-36 rounded-none"
                />
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-none"
                  onClick={() =>
                    setStatus.mutate({
                      orderNumber: o.orderNumber,
                      status: "SHIPPED",
                      trackingNumber: tracking[o.orderNumber] || undefined,
                      courierName: courier[o.orderNumber] || undefined,
                    })
                  }
                >
                  Mark shipped
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-none"
                  onClick={() => setStatus.mutate({ orderNumber: o.orderNumber, status: "DELIVERED" })}
                >
                  Mark delivered
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-none"
                  onClick={() => setStatus.mutate({ orderNumber: o.orderNumber, status: "ON_HOLD", note: "Placed on hold by admin" })}
                >
                  Hold
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-none"
                  onClick={() => {
                    if (confirm(`Cancel order ${o.orderNumber}? Stock is returned to sellers.`))
                      setStatus.mutate({ orderNumber: o.orderNumber, status: "CANCELLED", note: "Cancelled by admin" });
                  }}
                >
                  Cancel
                </Button>
              </div>
            </article>
          );
        })}
        {orders.length === 0 && <p className="text-sm text-muted-foreground">No orders yet.</p>}
      </div>
    </PortalLayout>
  );
}
