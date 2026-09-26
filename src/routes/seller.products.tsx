import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { PortalLayout, SELLER_NAV } from "@/components/hs/PortalLayout";
import { StatusBadge } from "@/components/hs/StatusBadge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { catalogueApi, sellerApi } from "@/lib/api";
import { NPR } from "@/lib/format";

export const Route = createFileRoute("/seller/products")({
  head: () => ({
    meta: [
      { title: "Seller Products | Hydro Sathi" },
      { name: "description", content: "Create and manage your hydropower spare part listings, stock and pricing." },
      { property: "og:title", content: "Seller Products | Hydro Sathi" },
      { property: "og:description", content: "Manage listings, prices and stock." },
    ],
  }),
  component: SellerProducts,
});

function SellerProducts() {
  const { user } = useAuth();
  const sellerId = user?.sellerId ?? 0;
  const [open, setOpen] = useState(false);
  const [images, setImages] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<Record<string, unknown> | null>(null);
  const v = (k: string) => (editing && editing[k] != null ? String(editing[k]) : "");
  const specsText = (raw: unknown) => {
    try {
      const o = typeof raw === "string" ? JSON.parse(raw) : raw;
      return o && typeof o === "object" ? Object.entries(o as Record<string, string>).map(([a, b]) => `${a}: ${b}`).join("\n") : "";
    } catch { return ""; }
  };
  const listText = (raw: unknown) => {
    try {
      const a = typeof raw === "string" ? JSON.parse(raw) : raw;
      return Array.isArray(a) ? a.join("\n") : "";
    } catch { return ""; }
  };
  const openNew = () => { setEditing(null); setImages([]); setOpen(true); };
  const openEdit = (p: Record<string, unknown>) => { setEditing(p); setImages([]); setOpen(true); };
  const removeProduct = async (p: Record<string, unknown>) => {
    if (!confirm(`Delete "${String(p["name"])}"? Buyers will no longer see it.`)) return;
    try {
      await sellerApi.deleteProduct(Number(p["id"]));
      toast.success("Product deleted");
      refetch();
      refetchSubmitted();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete the product");
    }
  };

  const { data: listings = [], refetch } = useQuery({
    queryKey: ["seller", "listings", sellerId],
    queryFn: () => sellerApi.listListings(),
  });
  const { data: submitted = [], refetch: refetchSubmitted } = useQuery({
    queryKey: ["seller", "submitted-products", sellerId],
    queryFn: sellerApi.listSubmittedProducts,
  });
  const { data: categories = [] } = useQuery({ queryKey: ["categories"], queryFn: catalogueApi.listCategories });

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editing && images.length === 0) {
      toast.error("Attach at least one product image file");
      return;
    }
    const form = e.currentTarget;
    const f = new FormData(form);
    setSaving(true);
    try {
      const fields = {
          name: String(f.get("name") ?? ""),
          partNumber: String(f.get("partNumber") ?? ""),
          oemNumber: String(f.get("oemNumber") ?? ""),
          categoryId: Number(f.get("categoryId")),
          manufacturer: String(f.get("manufacturer") ?? ""),
          shortDescription: String(f.get("shortDescription") ?? ""),
          specifications: String(f.get("specs") ?? ""),
          compatibility: String(f.get("compatibility") ?? ""),
          price: Number(f.get("price")),
          stockQuantity: Number(f.get("stock")),
          conditionType: String(f.get("conditionType") ?? "NEW"),
      };
      if (editing) {
        await sellerApi.updateProduct(Number(editing["id"]), fields, images);
        toast.success("Changes saved — the product is back in admin review");
      } else {
        await sellerApi.createProduct(fields, images);
        toast.success("Product submitted — buyers see it once an admin approves it");
      }
      setEditing(null);
      setOpen(false);
      setImages([]);
      form.reset();
      refetch();
      refetchSubmitted();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not submit the product");
    } finally {
      setSaving(false);
    }
  };

  return (
    <PortalLayout title="Products" subtitle="Your products and listings" badge="Seller portal" nav={SELLER_NAV}>
      <div className="mb-4 flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <Button className="rounded-none" onClick={openNew}>Add product</Button>
          <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto rounded-none">
            <DialogHeader>
              <DialogTitle>{editing ? `Edit “${v("name")}”` : "New product"}</DialogTitle>
            </DialogHeader>
            <p className="text-xs text-muted-foreground">
              Products you create stay hidden from buyers until the Hydro Sathi admin approves them.
            </p>
            <form key={editing ? String(editing["id"]) : "new"} onSubmit={submit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Label htmlFor="name">Product name</Label>
                  <Input id="name" name="name" defaultValue={v("name")} required maxLength={150} className="mt-1 rounded-none" />
                </div>
                <div>
                  <Label htmlFor="partNumber">Part number</Label>
                  <Input id="partNumber" name="partNumber" defaultValue={v("part_number")} required maxLength={60} className="mt-1 rounded-none" />
                </div>
                <div>
                  <Label htmlFor="oemNumber">OEM number</Label>
                  <Input id="oemNumber" name="oemNumber" defaultValue={v("oem_number")} maxLength={60} className="mt-1 rounded-none" />
                </div>
                <div>
                  <Label htmlFor="categoryId">Category</Label>
                  <select id="categoryId" name="categoryId" defaultValue={v("category_id")} required className="mt-1 w-full border border-input bg-background px-2 py-2 text-sm">
                    {categories.flatMap((c) => [c, ...(c.children ?? [])]).map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.parentId ? `— ${c.name}` : c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="manufacturer">Manufacturer / brand</Label>
                  <Input id="manufacturer" name="manufacturer" defaultValue={v("manufacturer")} maxLength={80} className="mt-1 rounded-none" />
                </div>
                <div>
                  <Label htmlFor="price">Price (NPR)</Label>
                  <Input id="price" name="price" type="number" min="1" required defaultValue={v("price")} className="mt-1 rounded-none" />
                </div>
                <div>
                  <Label htmlFor="stock">Stock quantity</Label>
                  <Input id="stock" name="stock" type="number" min="0" required defaultValue={editing ? v("stock_quantity") : 0} className="mt-1 rounded-none" />
                </div>
                <div>
                  <Label htmlFor="conditionType">Condition</Label>
                  <select id="conditionType" name="conditionType" defaultValue={v("condition_type") || "NEW"} className="mt-1 w-full border border-input bg-background px-2 py-2 text-sm">
                    <option value="NEW">New</option>
                    <option value="REFURBISHED">Refurbished</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <Label htmlFor="shortDescription">Short description</Label>
                  <Input id="shortDescription" name="shortDescription" defaultValue={v("short_description")} maxLength={200} className="mt-1 rounded-none" />
                </div>
                <div className="sm:col-span-2">
                  <Label htmlFor="specs">Specifications (key: value per line)</Label>
                  <Textarea id="specs" name="specs" defaultValue={editing ? specsText(editing["specifications"]) : ""} maxLength={1000} className="mt-1 rounded-none" />
                </div>
                <div className="sm:col-span-2">
                  <Label htmlFor="compatibility">Compatibility (one per line)</Label>
                  <Textarea id="compatibility" name="compatibility" defaultValue={editing ? listText(editing["compatibility"]) : ""} maxLength={500} className="mt-1 rounded-none" />
                </div>
                <div className="sm:col-span-2">
                  <Label htmlFor="images">Product images (files)</Label>
                  <Input
                    id="images"
                    type="file"
                    multiple
                    accept=".jpg,.jpeg,.png,.webp,.gif"
                    className="mt-1 rounded-none"
                    onChange={(e) => setImages(Array.from(e.target.files ?? []))}
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    {editing ? "Optional — new images are added to the existing ones. " : ""}Up to 6 images, 5 MB each. {images.length > 0 && `${images.length} selected.`}
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={saving} className="rounded-none">
                  {saving ? "Saving…" : editing ? "Save & resubmit" : "Submit for review"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <h2 className="section-title mb-2 text-sm">Products you submitted</h2>
      <div className="border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead>Part number</TableHead>
              <TableHead className="text-right">Price</TableHead>
              <TableHead className="text-right">Stock</TableHead>
              <TableHead>Review status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {submitted.map((p) => (
              <TableRow key={String(p["id"])}>
                <TableCell className="max-w-xs truncate font-medium">
                  {String(p["name"])}
                  {p["rejection_reason"] ? (
                    <span className="block text-xs text-destructive">{String(p["rejection_reason"])}</span>
                  ) : null}
                </TableCell>
                <TableCell className="part-no">{String(p["part_number"])}</TableCell>
                <TableCell className="text-right">{p["price"] ? NPR(Number(p["price"])) : "—"}</TableCell>
                <TableCell className="text-right">{String(p["stock_quantity"] ?? "—")}</TableCell>
                <TableCell>
                  <StatusBadge status={String(p["status"])} />
                </TableCell>
                <TableCell className="space-x-1 text-right">
                  <Button size="sm" variant="outline" className="rounded-none" onClick={() => openEdit(p)}>
                    Edit
                  </Button>
                  <Button size="sm" variant="destructive" className="rounded-none" onClick={() => removeProduct(p)}>
                    Delete
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {submitted.length === 0 && <p className="p-4 text-sm text-muted-foreground">You have not submitted any product yet.</p>}
      </div>

      <h2 className="section-title mb-2 mt-8 text-sm">All your listings</h2>
      <div className="border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead>Part number</TableHead>
              <TableHead>Condition</TableHead>
              <TableHead className="text-right">Price</TableHead>
              <TableHead className="text-right">Stock</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {listings.map(({ listing, product }) => (
              <TableRow key={listing.id}>
                <TableCell className="max-w-xs truncate font-medium">{product.name}</TableCell>
                <TableCell className="part-no">{product.partNumber}</TableCell>
                <TableCell>{listing.condition}</TableCell>
                <TableCell className="text-right">{NPR(listing.price)}</TableCell>
                <TableCell className="text-right">{listing.stockQuantity}</TableCell>
                <TableCell>
                  <StatusBadge status={listing.approvalStatus} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </PortalLayout>
  );
}
