import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ADMIN_NAV, PortalLayout } from "@/components/hs/PortalLayout";
import { StatusBadge } from "@/components/hs/StatusBadge";
import { adminApi, orderApi } from "@/lib/api";
import { NPR, formatDate } from "@/lib/format";

export const Route = createFileRoute("/admin/dashboard")({
  head: () => ({
    meta: [
      { title: "Admin Dashboard | Hydro Sathi" },
      {
        name: "description",
        content: "Marketplace metrics: sellers, products, orders, revenue, commission and pending settlements.",
      },
      { property: "og:title", content: "Admin Dashboard | Hydro Sathi" },
      { property: "og:description", content: "Hydro Sathi marketplace administration overview." },
    ],
  }),
  component: AdminDashboard,
});

function AdminDashboard() {
  const { data: stats } = useQuery({ queryKey: ["admin", "stats"], queryFn: adminApi.stats });
  const { data: orders = [] } = useQuery({ queryKey: ["admin", "orders"], queryFn: orderApi.listAllOrders });
  const { data: notifications = [] } = useQuery({
    queryKey: ["admin", "notifications"],
    queryFn: adminApi.listNotifications,
  });

  const chartData = orders.map((o) => ({
    name: o.orderNumber.slice(-6),
    revenue: o.totalAmount,
    commission: o.commissionAmount,
  }));

  const cards: [string, string][] = stats
    ? [
        ["Total buyers", String(stats.totalBuyers)],
        ["Total sellers", String(stats.totalSellers)],
        ["Pending sellers", String(stats.pendingSellers)],
        ["Total products", String(stats.totalProducts)],
        ["Pending products", String(stats.pendingProducts)],
        ["Total orders", String(stats.totalOrders)],
        ["Pending orders", String(stats.pendingOrders)],
        ["Refund requests", String(stats.refundRequests)],
        ["Gross revenue", NPR(stats.revenue)],
        ["Commission earned", NPR(stats.commission)],
        ["Pending settlements", NPR(stats.pendingSettlements)],
      ]
    : [];

  return (
    <PortalLayout title="Admin dashboard" subtitle="Marketplace overview" badge="Admin panel" nav={ADMIN_NAV}>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(([label, value]) => (
          <div key={label} className="border border-border bg-card p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
            <p className="mt-1 font-display text-2xl font-bold">{value}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[2fr_1fr]">
        <section className="border border-border bg-card p-4">
          <h2 className="section-title text-sm">Revenue vs commission by order</h2>
          <div className="mt-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="name" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip formatter={(v: number) => NPR(v)} />
                <Bar dataKey="revenue" fill="var(--chart-1)" />
                <Bar dataKey="commission" fill="var(--chart-3)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="border border-border bg-card">
          <h2 className="section-title border-b border-border p-4 text-sm">Notifications</h2>
          <ul className="divide-y divide-border">
            {notifications.map((n) => (
              <li key={n.id} className="p-4">
                <p className="text-sm font-semibold">{n.title}</p>
                <p className="text-xs text-muted-foreground">{n.message}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">{formatDate(n.createdAt)}</p>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="mt-6 border border-border bg-card">
        <h2 className="section-title border-b border-border p-4 text-sm">Latest orders</h2>
        <ul className="divide-y divide-border">
          {orders.map((o) => (
            <li key={o.id} className="flex flex-wrap items-center justify-between gap-2 p-4 text-sm">
              <span>
                <span className="font-semibold">{o.orderNumber}</span>
                <span className="ml-2 text-muted-foreground">{o.buyerName}</span>
              </span>
              <span className="flex items-center gap-2">
                <StatusBadge status={o.paymentStatus} />
                <StatusBadge status={o.orderStatus} />
                <span className="font-semibold">{NPR(o.totalAmount)}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>
    </PortalLayout>
  );
}
