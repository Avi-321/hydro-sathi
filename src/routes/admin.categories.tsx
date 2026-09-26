import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { ADMIN_NAV, PortalLayout } from "@/components/hs/PortalLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { adminApi } from "@/lib/api";
import type { Category } from "@/lib/types";

export const Route = createFileRoute("/admin/categories")({
  head: () => ({
    meta: [
      { title: "Category Management | Hydro Sathi Admin" },
      { name: "description", content: "Create, rename and remove hydropower spare part categories and subcategories." },
      { property: "og:title", content: "Category Management | Hydro Sathi Admin" },
      { property: "og:description", content: "Hierarchical category administration." },
    ],
  }),
  component: AdminCategories,
});

function AdminCategories() {
  const qc = useQueryClient();
  const { data: categories = [] } = useQuery({ queryKey: ["categories"], queryFn: adminApi.listCategories });
  const [name, setName] = useState("");
  const [parent, setParent] = useState("");
  const [editing, setEditing] = useState<{ id: number; name: string } | null>(null);

  const refresh = () => qc.invalidateQueries({ queryKey: ["categories"] });
  const fail = (e: unknown) => toast.error(e instanceof Error ? e.message : "Request failed");

  const create = useMutation({
    mutationFn: () =>
      adminApi.createCategory({ name: name.trim(), parentId: parent ? Number(parent) : null }),
    onSuccess: () => {
      toast.success(`Category “${name}” created`);
      setName("");
      setParent("");
      refresh();
    },
    onError: fail,
  });

  const rename = useMutation({
    mutationFn: (v: { id: number; name: string }) => adminApi.updateCategory(v.id, { name: v.name }),
    onSuccess: () => {
      toast.success("Category updated");
      setEditing(null);
      refresh();
    },
    onError: fail,
  });

  const toggle = useMutation({
    mutationFn: (v: { id: number; isActive: boolean }) => adminApi.updateCategory(v.id, { isActive: v.isActive }),
    onSuccess: () => {
      toast.success("Visibility updated");
      refresh();
    },
    onError: fail,
  });

  const remove = useMutation({
    mutationFn: (id: number) => adminApi.deleteCategory(id),
    onSuccess: () => {
      toast.success("Category removed");
      refresh();
    },
    onError: fail,
  });

  const renderRow = (c: Category, depth = 0) => (
    <li key={c.id} className="p-3" style={{ paddingLeft: 12 + depth * 20 }}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        {editing?.id === c.id ? (
          <form
            className="flex items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (editing.name.trim().length < 2) { toast.error("Enter a category name"); return; }
              rename.mutate({ id: c.id, name: editing.name.trim() });
            }}
          >
            <Input
              value={editing.name}
              onChange={(e) => setEditing({ id: c.id, name: e.target.value })}
              className="h-8 w-56 rounded-none"
            />
            <Button size="sm" type="submit" className="rounded-none">
              Save
            </Button>
            <Button size="sm" type="button" variant="outline" className="rounded-none" onClick={() => setEditing(null)}>
              Cancel
            </Button>
          </form>
        ) : (
          <span className="font-semibold">
            {c.name}
            <span className="part-no ml-2 text-xs text-muted-foreground">{c.slug}</span>
            {c.status !== "ACTIVE" && <span className="ml-2 text-xs text-muted-foreground">(hidden)</span>}
          </span>
        )}
        <span className="flex flex-wrap gap-1">
          <Button size="sm" variant="outline" className="rounded-none" onClick={() => setEditing({ id: c.id, name: c.name })}>
            Rename
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="rounded-none"
            onClick={() => toggle.mutate({ id: c.id, isActive: c.status !== "ACTIVE" })}
          >
            {c.status === "ACTIVE" ? "Hide" : "Show"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="rounded-none"
            onClick={() => {
              if (confirm(`Delete category “${c.name}”?`)) remove.mutate(c.id);
            }}
          >
            Delete
          </Button>
        </span>
      </div>
      {(c.children ?? []).length > 0 && (
        <ul className="mt-2 divide-y divide-border border-l border-border">
          {(c.children ?? []).map((sub) => renderRow(sub, depth + 1))}
        </ul>
      )}
    </li>
  );

  return (
    <PortalLayout title="Categories" subtitle="Category → subcategory → product" badge="Admin panel" nav={ADMIN_NAV}>
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <section className="border border-border bg-card">
          <h2 className="section-title border-b border-border p-4 text-sm">Category tree</h2>
          <ul className="divide-y divide-border">{categories.map((c) => renderRow(c))}</ul>
          {categories.length === 0 && <p className="p-4 text-sm text-muted-foreground">No categories yet.</p>}
        </section>

        <aside className="h-fit border border-border bg-card p-4">
          <h2 className="section-title text-sm">Add category</h2>
          <form
            className="mt-3 space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (name.trim().length < 2) { toast.error("Enter a category name"); return; }
              create.mutate();
            }}
          >
            <div>
              <Label htmlFor="cat-name">Name</Label>
              <Input
                id="cat-name"
                value={name}
                maxLength={80}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 rounded-none"
              />
            </div>
            <div>
              <Label htmlFor="cat-parent">Parent category</Label>
              <select
                id="cat-parent"
                value={parent}
                onChange={(e) => setParent(e.target.value)}
                className="mt-1 w-full border border-input bg-background px-2 py-2 text-sm"
              >
                <option value="">None (top level)</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <Button type="submit" disabled={create.isPending} className="w-full rounded-none">
              {create.isPending ? "Creating…" : "Create category"}
            </Button>
          </form>
        </aside>
      </div>
    </PortalLayout>
  );
}
