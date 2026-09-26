import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { SiteLayout } from "@/components/hs/SiteLayout";
import { Catalogue } from "@/components/hs/Catalogue";
import { catalogueApi } from "@/lib/api";

export const Route = createFileRoute("/category/$slug")({
  head: ({ params }) => {
    const name = params.slug.replace(/-/g, " ");
    return {
      meta: [
        { title: `${name} spare parts | Hydro Sathi` },
        {
          name: "description",
          content: `Browse ${name} spare parts from verified Nepali hydropower suppliers with part numbers, specifications and stock.`,
        },
        { property: "og:title", content: `${name} spare parts | Hydro Sathi` },
        { property: "og:description", content: `Verified sellers offering ${name} for hydropower plants in Nepal.` },
      ],
    };
  },
  component: CategoryPage,
});

function CategoryPage() {
  const { slug } = Route.useParams();
  const { data: categories = [] } = useQuery({ queryKey: ["categories"], queryFn: catalogueApi.listCategories });
  const category = categories.find((c) => c.slug === slug);

  return (
    <SiteLayout crumbs={[{ label: "Categories", to: "/categories" }, { label: category?.name ?? slug }]}>
      {category && (category.children?.length ?? 0) > 0 && (
        <div className="border-b border-border bg-card">
          <div className="mx-auto flex max-w-[1400px] flex-wrap gap-2 px-4 py-3">
            {category.children!.map((sub) => (
              <Link
                key={sub.id}
                to="/products"
                search={{ q: sub.name }}
                className="border border-border px-3 py-1.5 text-xs hover:border-primary hover:text-primary"
              >
                {sub.name}
              </Link>
            ))}
          </div>
        </div>
      )}
      <Catalogue title={category?.name ?? "Category"} categorySlug={slug} />
    </SiteLayout>
  );
}
