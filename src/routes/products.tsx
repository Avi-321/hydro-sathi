import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/components/hs/SiteLayout";
import { Catalogue } from "@/components/hs/Catalogue";

export const Route = createFileRoute("/products")({
  validateSearch: (search: Record<string, unknown>) => ({
    q: typeof search["q"] === "string" ? (search["q"] as string) : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Spare Parts Catalogue | Hydro Sathi" },
      {
        name: "description",
        content:
          "Browse and filter hydropower spare parts by category, brand, manufacturer, seller, condition and price.",
      },
      { property: "og:title", content: "Spare Parts Catalogue | Hydro Sathi" },
      { property: "og:description", content: "Filterable industrial catalogue of hydropower spare parts in Nepal." },
    ],
  }),
  component: ProductsPage,
});

function ProductsPage() {
  const { q } = Route.useSearch();
  return (
    <SiteLayout crumbs={[{ label: "Products" }]}>
      <Catalogue title={q ? `Search results` : "All spare parts"} initialQuery={q} />
    </SiteLayout>
  );
}
