import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { SiteLayout } from "@/components/hs/SiteLayout";
import { catalogueApi } from "@/lib/api";

export const Route = createFileRoute("/categories")({
  head: () => ({
    meta: [
      { title: "All Spare Part Categories | Hydro Sathi" },
      {
        name: "description",
        content:
          "Turbine, generator, bearing, valve, pump, hydraulic, electrical and control spare part categories for hydropower plants in Nepal.",
      },
      { property: "og:title", content: "All Spare Part Categories | Hydro Sathi" },
      { property: "og:description", content: "Browse the full Hydro Sathi hydropower parts category tree." },
    ],
  }),
  component: CategoriesPage,
});

function CategoriesPage() {
  const { data: categories = [] } = useQuery({ queryKey: ["categories"], queryFn: catalogueApi.listCategories });

  return (
    <SiteLayout crumbs={[{ label: "Categories" }]}>
      <div className="mx-auto max-w-[1400px] px-4 py-8">
        <h1 className="section-title text-2xl">All categories</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {categories.length} part families · {categories.reduce((s, c) => s + (c.children?.length ?? 0), 0)}{" "}
          subcategories
        </p>
        <div className="mt-6 grid gap-px bg-border md:grid-cols-2 lg:grid-cols-3">
          {categories.map((c) => (
            <div key={c.id} className="bg-card p-5">
              <Link to="/category/$slug" params={{ slug: c.slug }} className="section-title text-sm hover:text-primary">
                {c.name}
              </Link>
              <ul className="mt-2 space-y-1">
                {(c.children ?? []).map((sub) => (
                  <li key={sub.id}>
                    <Link
                      to="/products"
                      search={{ q: sub.name }}
                      className="text-sm text-muted-foreground hover:text-primary"
                    >
                      {sub.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </SiteLayout>
  );
}
