import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { ADMIN_NAV, PortalLayout } from "@/components/hs/PortalLayout";
import { StatusBadge } from "@/components/hs/StatusBadge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { adminApi, catalogueApi, uploadApi } from "@/lib/api";
import { formatDate } from "@/lib/format";
import type { Product } from "@/lib/types";

export const Route = createFileRoute("/admin/products")({
  head: () => ({
    meta: [
      { title: "Product Management | Hydro Sathi Admin" },
      { name: "description", content: "Create, edit, approve, assign and feature master products and seller listings." },
      { property: "og:title", content: "Product Management | Hydro Sathi Admin" },
      { property: "og:description", content: "Master product and listing administration." },
    ],
  }),
  component: AdminProducts,
});

interface Draft {
  id?: number;
  name: string;
  partNumber: string;
  oemNumber: string;
  categoryId: string;
  brandId: string;
  manufacturer: string;
  shortDescription: string;
  description: string;
  specifications: string;
  compatibility: string;
  unit: string;
  weightKg: string;
  hsCode: string;
  isFeatured: boolean;
  isNewArrival: boolean;
}

const specsToText = (o: Record<string, string>) => Object.entries(o).map(([k, v]) => `${k}: ${v}`).join("\n");
const textToSpecs = (t: string) => {
  const out: Record<string, string> = {};
  for (const line of t.split("\n")) {
    const i = line.indexOf(":");
    if (i > 0 && line.slice(0, i).trim()) out[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  return out;
};
const textToList = (t: string) => t.split("\n").map((x) => x.trim()).filter(Boolean);

const emptyDraft: Draft = {
  name: "",
  partNumber: "",
  oemNumber: "",
  categoryId: "",
  brandId: "",
  manufacturer: "",
  shortDescription: "",
  description: "",
  specifications: "",
  compatibility: "",
  unit: "pcs",
  weightKg: "",
  hsCode: "",
  isFeatured: false,
  isNewArrival: false,
};

function AdminProducts() {
  const qc = useQueryClient();
  const { data: products = [] } = useQuery({ queryKey: ["admin", "products"], queryFn: () => adminApi.listProducts() });
  const { data: categories = [] } = useQuery({ queryKey: ["categories"], queryFn: adminApi.listCategories });
  const { data: brands = [] } = useQuery({ queryKey: ["brands"], queryFn: catalogueApi.listBrands });
  const { data: sellers = [] } = useQuery({ queryKey: ["admin", "sellers"], queryFn: adminApi.listSellers });
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [images, setImages] = useState<File[]>([]);
  const [assignTo, setAssignTo] = useState<Product | null>(null);

  const flatCategories = categories.flatMap((c) => [c, ...(c.children ?? [])]);
  const approvedSellers = sellers.filter((s) => s.approvalStatus === "APPROVED");
  const refresh = () => qc.invalidateQueries({ queryKey: ["admin", "products"] });
  const fail = (e: unknown) => toast.error(e instanceof Error ? e.message : "Request failed");
  const set = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }));

  const save = useMutation({
    mutationFn: async () => {
      const payload: Record<string, unknown> = {
        name: draft.name.trim(),
        partNumber: draft.partNumber.trim(),
        categoryId: Number(draft.categoryId),
      };
      if (draft.oemNumber.trim()) payload["oemNumber"] = draft.oemNumber.trim();
      if (draft.brandId) payload["brandId"] = Number(draft.brandId);
      if (draft.manufacturer.trim()) payload["manufacturer"] = draft.manufacturer.trim();
      if (draft.shortDescription.trim()) payload["shortDescription"] = draft.shortDescription.trim();
      if (draft.description.trim()) payload["description"] = draft.description.trim();
      payload["specifications"] = textToSpecs(draft.specifications);
      payload["compatibility"] = textToList(draft.compatibility);
      payload["unit"] = draft.unit.trim() || "pcs";
      if (Number(draft.weightKg) > 0) payload["weightKg"] = Number(draft.weightKg);
      if (draft.hsCode.trim()) payload["hsCode"] = draft.hsCode.trim();
      payload["isFeatured"] = draft.isFeatured;
      payload["isNewArrival"] = draft.isNewArrival;
      if (draft.id) {
        await adminApi.updateProduct(draft.id, payload);
        if (images.length) await adminApi.uploadProductImages(draft.id, images);
        return;
      }
      // Images are uploaded as real files first; only stored file URLs are saved.
      if (images.length) {
        const uploaded = await uploadApi.images(images);
        payload["images"] = uploaded.map((f, i) => ({ url: f.url, isPrimary: i === 0 }));
      }
      await adminApi.createProduct(payload);
    },
    onSuccess: () => {
      toast.success(draft.id ? "Product updated" : "Product created");
      setDraft(emptyDraft);
      setImages([]);
      refresh();
    },
    onError: fail,
  });

  const setStatus = useMutation({
    mutationFn: (v: { id: number; status: string }) => adminApi.updateProduct(v.id, { status: v.status }),
    onSuccess: () => {
      toast.success("Product status updated");
      refresh();
    },
    onError: fail,
  });

  const flag = useMutation({
    mutationFn: (v: { id: number; patch: Record<string, unknown> }) => adminApi.updateProduct(v.id, v.patch),
    onSuccess: () => {
      toast.success("Storefront placement updated");
      refresh();
    },
    onError: fail,
  });

  const review = useMutation({
    mutationFn: (v: { id: number; status: "APPROVED" | "REJECTED"; reason?: string }) =>
      adminApi.reviewProduct(v.id, v.status, v.reason),
    onSuccess: () => {
      toast.success("Seller notified by email");
      refresh();
    },
    onError: fail,
  });

  const assign = useMutation({
    mutationFn: (v: { id: number; payload: Record<string, unknown> }) => adminApi.assignProduct(v.id, v.payload),
    onSuccess: () => {
      toast.success("Product assigned to seller");
      setAssignTo(null);
      refresh();
    },
    onError: fail,
  });

  const remove = useMutation({
    mutationFn: (id: number) => adminApi.deleteProduct(id),
    onSuccess: () => {
      toast.success("Product deleted");
      refresh();
    },
    onError: fail,
  });

  const edit = (p: Product) => {
    setImages([]);
    setDraft({
      id: p.id,
      name: p.name,
      partNumber: p.partNumber,
      oemNumber: p.oemNumber ?? "",
      categoryId: String(p.categoryId ?? ""),
      brandId: p.brandId ? String(p.brandId) : "",
      manufacturer: p.manufacturer ?? "",
      shortDescription: p.shortDescription ?? "",
      description: p.description ?? "",
      specifications: specsToText(p.specifications ?? {}),
      compatibility: (p.compatibility ?? []).join("\n"),
      unit: p.unit ?? "pcs",
      weightKg: p.weightKg ? String(p.weightKg) : "",
      hsCode: p.hsCode ?? "",
      isFeatured: Boolean(p.isFeatured),
      isNewArrival: Boolean(p.isNewArrival),
    });
  };

  return (
    <PortalLayout
      title="Products"
      subtitle="Create, edit, approve, assign and feature master products"
      badge="Admin panel"
      nav={ADMIN_NAV}
    >
      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Part number</TableHead>
                <TableHead>Submitted by</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="max-w-xs truncate font-medium">
                    {p.name}
                    <span className="ml-2 space-x-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                      {p.isFeatured && <span className="border border-border px-1">Featured</span>}
                      {p.isNewArrival && <span className="border border-border px-1">New</span>}
                    </span>
                  </TableCell>
                  <TableCell className="part-no">{p.partNumber}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{p.submittedBySeller ?? "Admin"}</TableCell>
                  <TableCell>{formatDate(p.createdAt)}</TableCell>
                  <TableCell>
                    <StatusBadge status={p.status} />
                  </TableCell>
                  <TableCell className="space-x-1 space-y-1 text-right">
                    <Button size="sm" variant="outline" className="rounded-none" onClick={() => edit(p)}>
                      Edit
                    </Button>
                    {p.status === "PENDING_REVIEW" ? (
                      <>
                        <Button size="sm" className="rounded-none" onClick={() => review.mutate({ id: p.id, status: "APPROVED" })}>
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="rounded-none"
                          onClick={() => {
                            const reason = prompt("Reason for rejection (emailed to the seller)") ?? "";
                            if (reason.trim()) review.mutate({ id: p.id, status: "REJECTED", reason: reason.trim() });
                          }}
                        >
                          Reject
                        </Button>
                      </>
                    ) : (
                      <Button
                        size="sm"
                        className="rounded-none"
                        disabled={p.status === "ACTIVE"}
                        onClick={() => setStatus.mutate({ id: p.id, status: "ACTIVE" })}
                      >
                        Activate
                      </Button>
                    )}
                    <Button size="sm" variant="outline" className="rounded-none" onClick={() => setAssignTo(p)}>
                      Assign
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-none"
                      onClick={() => flag.mutate({ id: p.id, patch: { isFeatured: !p.isFeatured } })}
                    >
                      {p.isFeatured ? "Unfeature" : "Feature"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-none"
                      onClick={() => flag.mutate({ id: p.id, patch: { isNewArrival: !p.isNewArrival } })}
                    >
                      {p.isNewArrival ? "Remove new" : "Mark new"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-none"
                      onClick={() => {
                        if (confirm(`Delete “${p.name}”? Buyers will no longer see it.`)) remove.mutate(p.id);
                      }}
                    >
                      Delete
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {products.length === 0 && <p className="p-4 text-sm text-muted-foreground">No products yet.</p>}
        </div>

        <aside className="h-fit border border-border bg-card p-4">
          <h2 className="section-title text-sm">{draft.id ? `Edit product #${draft.id}` : "New master product"}</h2>
          <form
            className="mt-3 space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (draft.name.trim().length < 3) { toast.error("Enter a product name"); return; }
              if (!draft.partNumber.trim()) { toast.error("Part number is required"); return; }
              if (!draft.categoryId) { toast.error("Choose a category"); return; }
              save.mutate();
            }}
          >
            <div>
              <Label htmlFor="p-name">Name</Label>
              <Input id="p-name" value={draft.name} onChange={(e) => set({ name: e.target.value })} className="mt-1 rounded-none" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="p-part">Part number</Label>
                <Input id="p-part" value={draft.partNumber} onChange={(e) => set({ partNumber: e.target.value })} className="mt-1 rounded-none" />
              </div>
              <div>
                <Label htmlFor="p-oem">OEM number</Label>
                <Input id="p-oem" value={draft.oemNumber} onChange={(e) => set({ oemNumber: e.target.value })} className="mt-1 rounded-none" />
              </div>
            </div>
            <div>
              <Label htmlFor="p-cat">Category</Label>
              <select
                id="p-cat"
                value={draft.categoryId}
                onChange={(e) => set({ categoryId: e.target.value })}
                className="mt-1 w-full border border-input bg-background px-2 py-2 text-sm"
              >
                <option value="">Select category…</option>
                {flatCategories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.parentId ? `— ${c.name}` : c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="p-brand">Brand</Label>
              <select
                id="p-brand"
                value={draft.brandId}
                onChange={(e) => set({ brandId: e.target.value })}
                className="mt-1 w-full border border-input bg-background px-2 py-2 text-sm"
              >
                <option value="">None</option>
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="p-manu">Manufacturer</Label>
              <Input id="p-manu" value={draft.manufacturer} onChange={(e) => set({ manufacturer: e.target.value })} className="mt-1 rounded-none" />
            </div>
            <div>
              <Label htmlFor="p-desc">Short description</Label>
              <Textarea
                id="p-desc"
                value={draft.shortDescription}
                onChange={(e) => set({ shortDescription: e.target.value })}
                className="mt-1 rounded-none"
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="p-longdesc">Full description</Label>
              <Textarea id="p-longdesc" value={draft.description} onChange={(e) => set({ description: e.target.value })} className="mt-1 rounded-none" rows={4} />
            </div>
            <div>
              <Label htmlFor="p-specs">Specifications (key: value per line)</Label>
              <Textarea id="p-specs" value={draft.specifications} onChange={(e) => set({ specifications: e.target.value })} className="mt-1 rounded-none" rows={3} placeholder={"Material: SS316\nBore: 120 mm"} />
            </div>
            <div>
              <Label htmlFor="p-compat">Compatibility (one per line)</Label>
              <Textarea id="p-compat" value={draft.compatibility} onChange={(e) => set({ compatibility: e.target.value })} className="mt-1 rounded-none" rows={3} placeholder={"Francis 5 MW\nPelton 2 MW"} />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label htmlFor="p-unit">Unit</Label>
                <Input id="p-unit" value={draft.unit} onChange={(e) => set({ unit: e.target.value })} className="mt-1 rounded-none" />
              </div>
              <div>
                <Label htmlFor="p-weight">Weight (kg)</Label>
                <Input id="p-weight" type="number" min="0" step="0.001" value={draft.weightKg} onChange={(e) => set({ weightKg: e.target.value })} className="mt-1 rounded-none" />
              </div>
              <div>
                <Label htmlFor="p-hs">HS code</Label>
                <Input id="p-hs" value={draft.hsCode} onChange={(e) => set({ hsCode: e.target.value })} className="mt-1 rounded-none" />
              </div>
            </div>
            <div className="flex gap-4 text-sm">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={draft.isFeatured} onChange={(e) => set({ isFeatured: e.target.checked })} /> Featured
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={draft.isNewArrival} onChange={(e) => set({ isNewArrival: e.target.checked })} /> New arrival
              </label>
            </div>
            <div>
              <Label htmlFor="p-img">Product images (files)</Label>
              <Input
                id="p-img"
                type="file"
                multiple
                accept=".jpg,.jpeg,.png,.webp,.gif"
                className="mt-1 rounded-none"
                onChange={(e) => setImages(Array.from(e.target.files ?? []))}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                JPG, PNG, WebP or GIF · up to 6 files, 5 MB each. {images.length > 0 && `${images.length} selected.`}
              </p>
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={save.isPending} className="flex-1 rounded-none">
                {save.isPending ? "Saving…" : draft.id ? "Save changes" : "Create product"}
              </Button>
              {draft.id && (
                <Button type="button" variant="outline" className="rounded-none" onClick={() => { setDraft(emptyDraft); setImages([]); }}>
                  Cancel
                </Button>
              )}
            </div>
          </form>
        </aside>
      </div>

      <Dialog open={Boolean(assignTo)} onOpenChange={(o) => !o && setAssignTo(null)}>
        <DialogContent className="rounded-none">
          <DialogHeader>
            <DialogTitle>Assign “{assignTo?.name}” to a seller</DialogTitle>
          </DialogHeader>
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (!assignTo) return;
              const f = new FormData(e.currentTarget);
              const sellerId = String(f.get("sellerId") ?? "");
              if (!sellerId) { toast.error("Choose a seller"); return; }
              assign.mutate({
                id: assignTo.id,
                payload: {
                  sellerId: Number(sellerId),
                  price: Number(f.get("price")),
                  stockQuantity: Number(f.get("stockQuantity")),
                  conditionType: String(f.get("conditionType")),
                },
              });
            }}
          >
            <div>
              <Label htmlFor="a-seller">Seller</Label>
              <select id="a-seller" name="sellerId" className="mt-1 w-full border border-input bg-background px-2 py-2 text-sm">
                <option value="">Select seller…</option>
                {approvedSellers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.businessName}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="a-price">Price (NPR)</Label>
                <Input id="a-price" name="price" type="number" min="1" required className="mt-1 rounded-none" />
              </div>
              <div>
                <Label htmlFor="a-stock">Stock</Label>
                <Input id="a-stock" name="stockQuantity" type="number" min="0" defaultValue={0} required className="mt-1 rounded-none" />
              </div>
            </div>
            <div>
              <Label htmlFor="a-cond">Condition</Label>
              <select id="a-cond" name="conditionType" className="mt-1 w-full border border-input bg-background px-2 py-2 text-sm">
                <option value="NEW">New</option>
                <option value="REFURBISHED">Refurbished</option>
              </select>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={assign.isPending} className="rounded-none">
                {assign.isPending ? "Assigning…" : "Assign product"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </PortalLayout>
  );
}
