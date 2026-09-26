import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { SlidersHorizontal } from "lucide-react";
import { ProductCard } from "./ProductCard";
import { EmptyState, LoadingGrid } from "./StateBlocks";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { catalogueApi } from "@/lib/api";
import type { ListingCondition, ProductQuery } from "@/lib/types";
import { cn } from "@/lib/utils";

interface Props {
  categorySlug?: string | undefined;
  initialQuery?: string | undefined;
  title: string;
}

const CONDITIONS: ListingCondition[] = ["NEW", "REFURBISHED", "USED"];

export function Catalogue({ categorySlug, initialQuery, title }: Props) {
  const [filters, setFilters] = useState<ProductQuery>({
    q: initialQuery,
    categorySlug,
    sort: "relevance",
    page: 1,
    pageSize: 9,
  });
  const [openFilters, setOpenFilters] = useState(false);

  const { data: categories = [] } = useQuery({ queryKey: ["categories"], queryFn: catalogueApi.listCategories });
  const { data: brands = [] } = useQuery({ queryKey: ["brands"], queryFn: catalogueApi.listBrands });
  const { data: manufacturers = [] } = useQuery({
    queryKey: ["manufacturers"],
    queryFn: catalogueApi.listManufacturers,
  });
  const { data: sellers = [] } = useQuery({ queryKey: ["sellers"], queryFn: catalogueApi.listSellers });

  const result = useQuery({
    queryKey: ["products", filters],
    queryFn: () => catalogueApi.searchProducts(filters),
  });

  const patch = (p: Partial<ProductQuery>) => setFilters((f) => ({ ...f, page: 1, ...p }));
  const toggle = (key: "brandIds" | "manufacturerIds" | "sellerIds", id: number) =>
    setFilters((f) => {
      const current = f[key] ?? [];
      return { ...f, page: 1, [key]: current.includes(id) ? current.filter((x) => x !== id) : [...current, id] };
    });

  const subcategories = categories.find((c) => c.slug === (filters.categorySlug ?? categorySlug))?.children ?? [];

  const FilterGroup = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div className="border-b border-border py-4">
      <h3 className="section-title mb-2 text-xs">{label}</h3>
      <div className="space-y-1.5">{children}</div>
    </div>
  );

  const Row = ({ id, label, checked, onChange }: { id: string; label: string; checked: boolean; onChange: () => void }) => (
    <div className="flex items-center gap-2">
      <Checkbox id={id} checked={checked} onCheckedChange={onChange} />
      <Label htmlFor={id} className="text-sm font-normal">
        {label}
      </Label>
    </div>
  );

  return (
    <div className="mx-auto max-w-[1400px] gap-6 px-4 py-6 lg:flex">
      <aside
        className={cn(
          "mb-4 shrink-0 border border-border bg-card p-4 lg:mb-0 lg:block lg:w-64",
          openFilters ? "block" : "hidden",
        )}
      >
        <h2 className="section-title text-sm">Filters</h2>

        <FilterGroup label="Category">
          <select
            value={filters.categorySlug ?? ""}
            onChange={(e) => patch({ categorySlug: e.target.value || undefined, subcategorySlug: undefined })}
            className="w-full border border-input bg-background px-2 py-1.5 text-sm"
          >
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
          {subcategories.length > 0 && (
            <select
              value={filters.subcategorySlug ?? ""}
              onChange={(e) => patch({ subcategorySlug: e.target.value || undefined })}
              className="mt-2 w-full border border-input bg-background px-2 py-1.5 text-sm"
            >
              <option value="">All subcategories</option>
              {subcategories.map((s) => (
                <option key={s.id} value={s.slug}>
                  {s.name}
                </option>
              ))}
            </select>
          )}
        </FilterGroup>

        <FilterGroup label="Part / OEM number">
          <Input
            value={filters.q ?? ""}
            onChange={(e) => patch({ q: e.target.value || undefined })}
            placeholder="e.g. 6205-2RS"
            className="h-9 rounded-none"
          />
        </FilterGroup>

        <FilterGroup label="Brand">
          {brands.map((b) => (
            <Row
              key={b.id}
              id={`brand-${b.id}`}
              label={b.name}
              checked={(filters.brandIds ?? []).includes(b.id)}
              onChange={() => toggle("brandIds", b.id)}
            />
          ))}
        </FilterGroup>

        <FilterGroup label="Manufacturer">
          {manufacturers.map((m) => (
            <Row
              key={m.id}
              id={`man-${m.id}`}
              label={m.name}
              checked={(filters.manufacturerIds ?? []).includes(m.id)}
              onChange={() => toggle("manufacturerIds", m.id)}
            />
          ))}
        </FilterGroup>

        <FilterGroup label="Seller">
          {sellers.map((s) => (
            <Row
              key={s.id}
              id={`seller-${s.id}`}
              label={s.businessName}
              checked={(filters.sellerIds ?? []).includes(s.id)}
              onChange={() => toggle("sellerIds", s.id)}
            />
          ))}
        </FilterGroup>

        <FilterGroup label="Condition">
          {CONDITIONS.map((c) => (
            <Row
              key={c}
              id={`cond-${c}`}
              label={c.charAt(0) + c.slice(1).toLowerCase()}
              checked={(filters.conditions ?? []).includes(c)}
              onChange={() =>
                setFilters((f) => {
                  const cur = f.conditions ?? [];
                  return {
                    ...f,
                    page: 1,
                    conditions: cur.includes(c) ? cur.filter((x) => x !== c) : [...cur, c],
                  };
                })
              }
            />
          ))}
        </FilterGroup>

        <FilterGroup label="Price (NPR)">
          <div className="flex gap-2">
            <Input
              type="number"
              placeholder="Min"
              className="h-9 rounded-none"
              onChange={(e) => patch({ minPrice: e.target.value ? Number(e.target.value) : undefined })}
            />
            <Input
              type="number"
              placeholder="Max"
              className="h-9 rounded-none"
              onChange={(e) => patch({ maxPrice: e.target.value ? Number(e.target.value) : undefined })}
            />
          </div>
        </FilterGroup>

        <FilterGroup label="Availability">
          <Row
            id="in-stock"
            label="In stock only"
            checked={!!filters.inStockOnly}
            onChange={() => patch({ inStockOnly: !filters.inStockOnly })}
          />
        </FilterGroup>

        <Button
          variant="outline"
          className="mt-4 w-full rounded-none"
          onClick={() => setFilters({ categorySlug, sort: "relevance", page: 1, pageSize: 9 })}
        >
          Reset filters
        </Button>
      </aside>

      <section className="min-w-0 flex-1">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border border-border bg-card px-4 py-3">
          <div>
            <h1 className="section-title text-lg">{title}</h1>
            <p className="text-xs text-muted-foreground">
              {result.data?.total ?? 0} parts found
              {filters.q ? ` for “${filters.q}”` : ""}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="rounded-none lg:hidden"
              onClick={() => setOpenFilters((v) => !v)}
            >
              <SlidersHorizontal className="mr-1 h-4 w-4" /> Filters
            </Button>
            <Select value={filters.sort ?? "relevance"} onValueChange={(v) => patch({ sort: v as NonNullable<ProductQuery["sort"]> })}>
              <SelectTrigger className="h-9 w-44 rounded-none">
                <SelectValue placeholder="Sort" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="relevance">Relevance</SelectItem>
                <SelectItem value="price_asc">Price: low to high</SelectItem>
                <SelectItem value="price_desc">Price: high to low</SelectItem>
                <SelectItem value="newest">Newest first</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {result.isLoading ? (
          <LoadingGrid />
        ) : (result.data?.data.length ?? 0) === 0 ? (
          <EmptyState
            title="No parts matched"
            description="Try a different part number, clear some filters, or submit a procurement request and verified sellers will quote you."
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {result.data?.data.map((item) => <ProductCard key={item.product.id} item={item} />)}
          </div>
        )}

        {(result.data?.totalPages ?? 1) > 1 && (
          <div className="mt-6 flex items-center justify-center gap-2">
            <Button
              variant="outline"
              className="rounded-none"
              disabled={(filters.page ?? 1) <= 1}
              onClick={() => setFilters((f) => ({ ...f, page: (f.page ?? 1) - 1 }))}
            >
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {result.data?.page} of {result.data?.totalPages}
            </span>
            <Button
              variant="outline"
              className="rounded-none"
              disabled={(filters.page ?? 1) >= (result.data?.totalPages ?? 1)}
              onClick={() => setFilters((f) => ({ ...f, page: (f.page ?? 1) + 1 }))}
            >
              Next
            </Button>
          </div>
        )}
      </section>
    </div>
  );
}
