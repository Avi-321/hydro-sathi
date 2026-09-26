import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { SiteLayout } from "@/components/hs/SiteLayout";
import { ProductCard } from "@/components/hs/ProductCard";
import { EmptyState } from "@/components/hs/StateBlocks";
import { Button } from "@/components/ui/button";
import { catalogueApi } from "@/lib/api";
import { useAppState } from "@/lib/store";

export const Route = createFileRoute("/wishlist")({
  head: () => ({
    meta: [
      { title: "Wishlist | Hydro Sathi" },
      { name: "description", content: "Saved hydropower spare parts for your next procurement cycle." },
      { property: "og:title", content: "Wishlist | Hydro Sathi" },
      { property: "og:description", content: "Your saved parts on Hydro Sathi." },
    ],
  }),
  component: WishlistPage,
});

function WishlistPage() {
  const { wishlist, user } = useAppState();
  const { data } = useQuery({
    queryKey: ["products", "all-for-wishlist"],
    queryFn: () => catalogueApi.searchProducts({ pageSize: 100 }),
  });
  const items = (data?.data ?? []).filter((i) => wishlist.includes(i.product.id));

  return (
    <SiteLayout crumbs={[{ label: "Wishlist" }]}>
      <div className="mx-auto max-w-[1400px] px-4 py-8">
        <h1 className="section-title text-2xl">Wishlist</h1>
        {!user || items.length === 0 ? (
          <div className="mt-6">
            <EmptyState
              title={user ? "No saved parts yet" : "Sign in to use your wishlist"}
              description="Save parts you plan to order later and compare seller offers when you are ready."
              action={
                <Button asChild className="rounded-none">
                  <Link to={user ? "/products" : "/signin"}>{user ? "Browse parts" : "Sign in"}</Link>
                </Button>
              }
            />
          </div>
        ) : (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {items.map((i) => (
              <ProductCard key={i.product.id} item={i} />
            ))}
          </div>
        )}
      </div>
    </SiteLayout>
  );
}
