import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BadgeCheck } from "lucide-react";
import { SiteLayout } from "@/components/hs/SiteLayout";
import { Button } from "@/components/ui/button";
import { catalogueApi } from "@/lib/api";

export const Route = createFileRoute("/sellers")({
  head: () => ({
    meta: [
      { title: "Verified Sellers | Hydro Sathi" },
      {
        name: "description",
        content: "Document-verified hydropower spare part suppliers across Nepal listed on Hydro Sathi.",
      },
      { property: "og:title", content: "Verified Sellers | Hydro Sathi" },
      { property: "og:description", content: "Admin-approved suppliers of hydropower spare parts in Nepal." },
    ],
  }),
  component: SellersPage,
});

function SellersPage() {
  const { data: sellers = [] } = useQuery({ queryKey: ["sellers"], queryFn: catalogueApi.listSellers });

  return (
    <SiteLayout crumbs={[{ label: "Verified sellers" }]}>
      <div className="mx-auto max-w-[1400px] px-4 py-8">
        <h1 className="section-title text-2xl">Verified sellers</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Each seller is approved by Hydro Sathi admin after business registration, PAN/VAT and identity document
          verification.
        </p>
        <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {sellers.map((s) => (
            <article key={s.id} className="border border-border bg-card p-5">
              <div className="flex items-center gap-2">
                <BadgeCheck className="h-5 w-5 text-success" />
                <h2 className="font-semibold">{s.businessName}</h2>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{s.description}</p>
              <dl className="mt-4 space-y-1 text-xs text-muted-foreground">
                <div className="flex justify-between">
                  <dt>Location</dt>
                  <dd className="text-foreground">
                    {s.city}, {s.district}, {s.province}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt>Business type</dt>
                  <dd className="text-foreground">{s.businessType}</dd>
                </div>
                <div className="flex justify-between">
                  <dt>Listed parts</dt>
                  <dd className="text-foreground">{s.totalProducts}</dd>
                </div>
                <div className="flex justify-between">
                  <dt>Rating</dt>
                  <dd className="text-foreground">★ {s.rating}</dd>
                </div>
              </dl>
              <Button asChild variant="outline" className="mt-4 w-full rounded-none">
                <Link to="/products" search={{ q: "" }}>View their parts</Link>
              </Button>
            </article>
          ))}
        </div>
      </div>
    </SiteLayout>
  );
}
