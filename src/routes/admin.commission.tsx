import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { ADMIN_NAV, PortalLayout } from "@/components/hs/PortalLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { adminApi, orderApi } from "@/lib/api";
import { NPR } from "@/lib/format";

export const Route = createFileRoute("/admin/commission")({
  head: () => ({
    meta: [
      { title: "Commission Settings | Hydro Sathi Admin" },
      {
        name: "description",
        content: "Configure global, seller-specific and category commission rates with historical snapshots.",
      },
      { property: "og:title", content: "Commission Settings | Hydro Sathi Admin" },
      { property: "og:description", content: "Commission scope configuration." },
    ],
  }),
  component: AdminCommission,
});

type Row = Record<string, any>;

function AdminCommission() {
  const qc = useQueryClient();
  const { data: sellers = [] } = useQuery({ queryKey: ["admin", "sellers"], queryFn: adminApi.listSellers });
  const { data: orders = [] } = useQuery({ queryKey: ["admin", "orders"], queryFn: orderApi.listAllOrders });
  const { data: categories = [] } = useQuery({ queryKey: ["categories"], queryFn: adminApi.listCategories });
  const settingsQuery = useQuery({ queryKey: ["admin", "commission-settings"], queryFn: adminApi.listCommissionSettings });
  const settings: Row[] = settingsQuery.data?.data ?? [];

  const activeGlobal = settings.find((s) => s["scope_type"] === "GLOBAL" && !s["effective_to"]);
  const [global, setGlobal] = useState<string>("");
  const [sellerRates, setSellerRates] = useState<Record<number, string>>({});
  const [categoryScope, setCategoryScope] = useState("");
  const [categoryRate, setCategoryRate] = useState("");

  const globalValue = global !== "" ? global : String(activeGlobal?.["rate"] ?? 10);
  const fail = (e: unknown) => toast.error(e instanceof Error ? e.message : "Request failed");
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["admin", "commission-settings"] });
    qc.invalidateQueries({ queryKey: ["admin", "sellers"] });
  };

  const saveRate = useMutation({
    mutationFn: (v: { scopeType: "GLOBAL" | "SELLER" | "CATEGORY"; scopeId?: number; rate: number }) =>
      adminApi.createCommissionSetting(v),
    onSuccess: () => {
      toast.success("Commission rate saved — existing orders keep their snapshot");
      refresh();
    },
    onError: fail,
  });

  const rateFor = (scopeType: string, scopeId: number) =>
    settings.find((s) => s["scope_type"] === scopeType && Number(s["scope_id"]) === scopeId && !s["effective_to"])?.["rate"];

  return (
    <PortalLayout title="Commission" subtitle="Rates are snapshotted per order item" badge="Admin panel" nav={ADMIN_NAV}>
      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <section className="h-fit space-y-6 border border-border bg-card p-4">
          <div>
            <h2 className="section-title text-sm">Global commission</h2>
            <form
              className="mt-3 space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                saveRate.mutate({ scopeType: "GLOBAL", rate: Number(globalValue) });
              }}
            >
              <div>
                <Label htmlFor="rate">Rate (%)</Label>
                <Input
                  id="rate"
                  type="number"
                  min="0"
                  max="50"
                  step="0.5"
                  value={globalValue}
                  onChange={(e) => setGlobal(e.target.value)}
                  className="mt-1 rounded-none"
                />
              </div>
              <Button type="submit" disabled={saveRate.isPending} className="w-full rounded-none">
                Save global rate
              </Button>
              <p className="text-xs text-muted-foreground">
                Changing this rate never alters historical orders — each order item keeps its own snapshot.
              </p>
            </form>
          </div>

          <div>
            <h2 className="section-title text-sm">Category commission</h2>
            <form
              className="mt-3 space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                if (!categoryScope) { toast.error("Choose a category"); return; }
                saveRate.mutate({ scopeType: "CATEGORY", scopeId: Number(categoryScope), rate: Number(categoryRate || 0) });
              }}
            >
              <select
                value={categoryScope}
                onChange={(e) => setCategoryScope(e.target.value)}
                className="w-full border border-input bg-background px-2 py-2 text-sm"
              >
                <option value="">Select category…</option>
                {categories.flatMap((c) => [c, ...(c.children ?? [])]).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.parentId ? `— ${c.name}` : c.name}
                    {rateFor("CATEGORY", c.id) !== undefined ? ` (${rateFor("CATEGORY", c.id)}%)` : ""}
                  </option>
                ))}
              </select>
              <Input
                type="number"
                min="0"
                max="50"
                step="0.5"
                placeholder="Rate (%)"
                value={categoryRate}
                onChange={(e) => setCategoryRate(e.target.value)}
                className="rounded-none"
              />
              <Button type="submit" variant="outline" className="w-full rounded-none">
                Save category rate
              </Button>
            </form>
          </div>
        </section>

        <section className="border border-border bg-card">
          <h2 className="section-title border-b border-border p-4 text-sm">Seller-specific rates</h2>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Seller</TableHead>
                <TableHead className="text-right">Rate</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sellers.map((s) => {
                const current = sellerRates[s.id] ?? String(rateFor("SELLER", s.id) ?? s.commissionRate ?? globalValue);
                return (
                  <TableRow key={s.id}>
                    <TableCell>{s.businessName}</TableCell>
                    <TableCell className="text-right">
                      <Input
                        type="number"
                        min="0"
                        max="50"
                        step="0.5"
                        value={current}
                        onChange={(e) => setSellerRates((r) => ({ ...r, [s.id]: e.target.value }))}
                        className="ml-auto h-8 w-24 rounded-none text-right"
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-none"
                        onClick={() => saveRate.mutate({ scopeType: "SELLER", scopeId: s.id, rate: Number(current) })}
                      >
                        Save
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </section>
      </div>

      <section className="mt-6 border border-border bg-card">
        <h2 className="section-title border-b border-border p-4 text-sm">Commission snapshots by order item</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order</TableHead>
              <TableHead>Item</TableHead>
              <TableHead>Seller</TableHead>
              <TableHead className="text-right">Gross</TableHead>
              <TableHead className="text-right">Rate</TableHead>
              <TableHead className="text-right">Commission</TableHead>
              <TableHead className="text-right">Seller net</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.flatMap((o) =>
              o.items.map((i) => (
                <TableRow key={`${o.id}-${i.id}`}>
                  <TableCell className="part-no">{o.orderNumber}</TableCell>
                  <TableCell className="max-w-xs truncate">{i.productNameSnapshot}</TableCell>
                  <TableCell>{i.sellerNameSnapshot}</TableCell>
                  <TableCell className="text-right">{NPR(i.subtotal)}</TableCell>
                  <TableCell className="text-right">{i.commissionRate}%</TableCell>
                  <TableCell className="text-right">{NPR(i.commissionAmount)}</TableCell>
                  <TableCell className="text-right font-semibold">{NPR(i.sellerAmount)}</TableCell>
                </TableRow>
              )),
            )}
          </TableBody>
        </Table>
      </section>
    </PortalLayout>
  );
}
