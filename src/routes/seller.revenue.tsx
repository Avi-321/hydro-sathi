import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { PortalLayout, SELLER_NAV } from "@/components/hs/PortalLayout";
import { StatusBadge } from "@/components/hs/StatusBadge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { sellerApi } from "@/lib/api";
import { NPR, formatDate } from "@/lib/format";

export const Route = createFileRoute("/seller/revenue")({
  head: () => ({
    meta: [
      { title: "Seller Revenue & Settlements | Hydro Sathi" },
      { name: "description", content: "Gross revenue, commission deductions, refunds and settlement status." },
      { property: "og:title", content: "Seller Revenue | Hydro Sathi" },
      { property: "og:description", content: "Order-level settlement reporting for Hydro Sathi sellers." },
    ],
  }),
  component: SellerRevenue,
});


function SellerRevenue() {
  const { user } = useAuth();
  const sellerId = user?.sellerId ?? 0;
  const { data: settlements = [] } = useQuery({
    queryKey: ["seller", "settlements", sellerId],
    queryFn: () => sellerApi.listSettlements(),
  });

  const total = settlements.reduce(
    (acc, s) => ({
      gross: acc.gross + s.grossAmount,
      commission: acc.commission + s.commissionAmount,
      refund: acc.refund + s.refundAmount,
      net: acc.net + s.netAmount,
      pending: acc.pending + (s.status === "PAID" ? 0 : s.netAmount),
    }),
    { gross: 0, commission: 0, refund: 0, net: 0, pending: 0 },
  );

  return (
    <PortalLayout title="Revenue" subtitle="All values are computed server-side" badge="Seller portal" nav={SELLER_NAV}>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {[
          ["Gross amount", total.gross],
          ["Commission", total.commission],
          ["Refunds", total.refund],
          ["Net earnings", total.net],
          ["Pending settlement", total.pending],
        ].map(([label, value]) => (
          <div key={label as string} className="border border-border bg-card p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
            <p className="mt-1 font-display text-xl font-bold">{NPR(value as number)}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 border border-border bg-card">
        <h2 className="section-title border-b border-border p-4 text-sm">Settlement records</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Gross</TableHead>
              <TableHead className="text-right">Commission</TableHead>
              <TableHead className="text-right">Refund</TableHead>
              <TableHead className="text-right">Net</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {settlements.map((s) => (
              <TableRow key={s.id}>
                <TableCell className="part-no">{s.orderNumber}</TableCell>
                <TableCell>{formatDate(s.createdAt)}</TableCell>
                <TableCell className="text-right">{NPR(s.grossAmount)}</TableCell>
                <TableCell className="text-right">−{NPR(s.commissionAmount)}</TableCell>
                <TableCell className="text-right">−{NPR(s.refundAmount)}</TableCell>
                <TableCell className="text-right font-semibold">{NPR(s.netAmount)}</TableCell>
                <TableCell>
                  <StatusBadge status={s.status} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </PortalLayout>
  );
}
