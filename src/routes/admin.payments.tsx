import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ADMIN_NAV, PortalLayout } from "@/components/hs/PortalLayout";
import { StatusBadge } from "@/components/hs/StatusBadge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { adminApi, orderApi } from "@/lib/api";
import { NPR, formatDate } from "@/lib/format";

export const Route = createFileRoute("/admin/payments")({
  head: () => ({
    meta: [
      { title: "Payments & Settlements | Hydro Sathi Admin" },
      { name: "description", content: "Payment transactions, commission records and seller settlement trail." },
      { property: "og:title", content: "Payments & Settlements | Hydro Sathi Admin" },
      { property: "og:description", content: "Complete marketplace financial trail." },
    ],
  }),
  component: AdminPayments,
});

function AdminPayments() {
  const { data: orders = [] } = useQuery({ queryKey: ["admin", "orders"], queryFn: orderApi.listAllOrders });
  const { data: settlements = [] } = useQuery({
    queryKey: ["seller", "settlements", 1],
    queryFn: () => adminApi.listSettlements(),
  });

  return (
    <PortalLayout title="Payments" subtitle="Transactions, commissions and settlements" badge="Admin panel" nav={ADMIN_NAV}>
      <section className="border border-border bg-card">
        <h2 className="section-title border-b border-border p-4 text-sm">Payment transactions</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order</TableHead>
              <TableHead>Provider</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="text-right">Commission</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((o) => (
              <TableRow key={o.id}>
                <TableCell className="part-no">{o.orderNumber}</TableCell>
                <TableCell>{o.paymentProvider}</TableCell>
                <TableCell>{formatDate(o.createdAt)}</TableCell>
                <TableCell className="text-right">{NPR(o.totalAmount)}</TableCell>
                <TableCell className="text-right">{NPR(o.commissionAmount)}</TableCell>
                <TableCell>
                  <StatusBadge status={o.paymentStatus} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </section>

      <section className="mt-6 border border-border bg-card">
        <h2 className="section-title border-b border-border p-4 text-sm">Seller settlements</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order</TableHead>
              <TableHead className="text-right">Gross</TableHead>
              <TableHead className="text-right">Commission</TableHead>
              <TableHead className="text-right">Refund</TableHead>
              <TableHead className="text-right">Net payable</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {settlements.map((s) => (
              <TableRow key={s.id}>
                <TableCell className="part-no">{s.orderNumber}</TableCell>
                <TableCell className="text-right">{NPR(s.grossAmount)}</TableCell>
                <TableCell className="text-right">{NPR(s.commissionAmount)}</TableCell>
                <TableCell className="text-right">{NPR(s.refundAmount)}</TableCell>
                <TableCell className="text-right font-semibold">{NPR(s.netAmount)}</TableCell>
                <TableCell>
                  <StatusBadge status={s.status} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </section>
    </PortalLayout>
  );
}
