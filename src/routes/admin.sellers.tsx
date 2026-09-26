import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { ADMIN_NAV, PortalLayout } from "@/components/hs/PortalLayout";
import { StatusBadge } from "@/components/hs/StatusBadge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { adminApi } from "@/lib/api";
import { formatDate } from "@/lib/format";
import type { Seller } from "@/lib/types";

export const Route = createFileRoute("/admin/sellers")({
  head: () => ({
    meta: [
      { title: "Seller Management | Hydro Sathi Admin" },
      { name: "description", content: "Review seller applications and documents, approve, reject or suspend sellers." },
      { property: "og:title", content: "Seller Management | Hydro Sathi Admin" },
      { property: "og:description", content: "Seller verification workflow." },
    ],
  }),
  component: AdminSellers,
});

const DOCS = ["BUSINESS_REGISTRATION", "PAN", "IDENTITY", "BANK_DOCUMENT"];

function SellerDialog({ seller }: { seller: Seller }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="rounded-none">
          Review
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl rounded-none">
        <DialogHeader>
          <DialogTitle>{seller.businessName}</DialogTitle>
        </DialogHeader>
        <dl className="space-y-1 text-sm">
          {[
            ["Registration", seller.registrationNumber],
            ["PAN", seller.panNumber],
            ["Location", `${seller.city}, ${seller.district}, ${seller.province}`],
            ["Commission rate", `${seller.commissionRate}%`],
            ["Applied", formatDate(seller.createdAt)],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between border-b border-border py-1.5">
              <dt className="text-muted-foreground">{k}</dt>
              <dd className="font-medium">{v}</dd>
            </div>
          ))}
        </dl>
        <div>
          <h3 className="section-title text-xs">Documents</h3>
          <ul className="mt-2 space-y-1 text-sm">
            {DOCS.map((d) => (
              <li key={d} className="flex items-center justify-between border border-border px-3 py-2">
                <span>{d.replace(/_/g, " ").toLowerCase()}</span>
                <Button variant="ghost" size="sm" onClick={() => toast.message("Opening document viewer…")}>
                  View file
                </Button>
              </li>
            ))}
          </ul>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button className="rounded-none" onClick={() => toast.success("Seller approved")}>
            Approve
          </Button>
          <Button variant="outline" className="rounded-none" onClick={() => toast.message("Seller rejected")}>
            Reject
          </Button>
          <Button variant="outline" className="rounded-none" onClick={() => toast.message("Seller suspended")}>
            Suspend
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AdminSellers() {
  const { data: sellers = [] } = useQuery({ queryKey: ["admin", "sellers"], queryFn: adminApi.listSellers });

  return (
    <PortalLayout title="Sellers" subtitle="Applications, verification and status" badge="Admin panel" nav={ADMIN_NAV}>
      <div className="border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Business</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>PAN</TableHead>
              <TableHead className="text-right">Commission</TableHead>
              <TableHead>Applied</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sellers.map((s) => (
              <TableRow key={s.id}>
                <TableCell className="font-medium">{s.businessName}</TableCell>
                <TableCell>
                  {s.city}, {s.province}
                </TableCell>
                <TableCell className="part-no">{s.panNumber}</TableCell>
                <TableCell className="text-right">{s.commissionRate}%</TableCell>
                <TableCell>{formatDate(s.createdAt)}</TableCell>
                <TableCell>
                  <StatusBadge status={s.approvalStatus} />
                </TableCell>
                <TableCell className="text-right">
                  <SellerDialog seller={s} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </PortalLayout>
  );
}
