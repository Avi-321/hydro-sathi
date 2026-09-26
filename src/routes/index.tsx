import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  BadgeCheck,
  Boxes,
  FileSearch,
  PackageCheck,
  Search,
  ShieldCheck,
  Truck,
  Wrench,
} from "lucide-react";
import heroImg from "@/assets/hero-hydropower.jpg";
import { SiteLayout } from "@/components/hs/SiteLayout";
import { ProductCard } from "@/components/hs/ProductCard";
import { LoadingGrid } from "@/components/hs/StateBlocks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { catalogueApi } from "@/lib/api";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Hydro Sathi — Buy Hydropower Spare Parts in Nepal" },
      {
        name: "description",
        content:
          "Search turbine, generator, bearing, valve, pump and electrical spare parts by part number or OEM number and order from verified Nepali sellers.",
      },
      { property: "og:title", content: "Hydro Sathi — Hydropower Spare Parts Marketplace" },
      {
        property: "og:description",
        content: "Verified sellers, traceable part numbers and server-verified eSewa/Khalti payments.",
      },
    ],
  }),
  component: Home,
});

const WHY = [
  { icon: BadgeCheck, title: "Verified sellers", text: "Every seller is document-verified and admin-approved before listing." },
  { icon: FileSearch, title: "Part-number accuracy", text: "Search by part number, OEM number or SKU with full specifications." },
  { icon: ShieldCheck, title: "Protected payments", text: "eSewa and Khalti transactions verified server-side before dispatch." },
  { icon: Truck, title: "Nepal-wide delivery", text: "Courier, bus cargo and seller delivery options with tracking." },
];

const STEPS = [
  { icon: Search, title: "Search the part", text: "Use the part number, OEM number or category tree." },
  { icon: Boxes, title: "Compare sellers", text: "Same master part, multiple verified sellers, transparent pricing." },
  { icon: PackageCheck, title: "Order & pay", text: "Pay with eSewa, Khalti or approved COD." },
  { icon: Wrench, title: "Track to site", text: "Seller confirmation, admin approval, shipping and delivery updates." },
];

function Home() {
  const navigate = useNavigate();
  const [term, setTerm] = useState("");
  const { data: categories = [] } = useQuery({ queryKey: ["categories"], queryFn: catalogueApi.listCategories });
  const featured = useQuery({
    queryKey: ["products", "featured"],
    queryFn: () => catalogueApi.searchProducts({ pageSize: 6 }),
  });
  const newest = useQuery({
    queryKey: ["products", "newest"],
    queryFn: () => catalogueApi.searchProducts({ sort: "newest", pageSize: 3 }),
  });
  const { data: sellers = [] } = useQuery({ queryKey: ["sellers"], queryFn: catalogueApi.listSellers });

  return (
    <SiteLayout>
      {/* Hero */}
      <section className="relative isolate bg-steel">
        <img
          src={heroImg}
          alt="Hydropower plant turbine hall"
          width={1920}
          height={1080}
          className="absolute inset-0 h-full w-full object-cover opacity-35"
        />
        <div className="relative mx-auto max-w-[1400px] px-4 py-16 md:py-24">
          <p className="mb-3 inline-block bg-accent px-2 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-accent-foreground">
            Nepal · B2B & B2C marketplace
          </p>
          <h1 className="max-w-3xl font-display text-4xl font-bold uppercase leading-tight text-steel-foreground md:text-6xl">
            Genuine hydropower spare parts, sourced from verified sellers
          </h1>
          <p className="mt-4 max-w-2xl text-steel-foreground/80">
            Turbine, generator, bearing, valve, pump, hydraulic and control spares — searchable by part number and
            OEM number, delivered across Nepal.
          </p>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              navigate({ to: "/products", search: { q: term || undefined } });
            }}
            className="mt-8 flex max-w-2xl flex-col gap-2 sm:flex-row"
          >
            <Input
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder="Enter part number, OEM number or product name"
              className="h-12 rounded-none border-0 bg-card"
              aria-label="Search parts"
            />
            <Button type="submit" size="lg" className="h-12 rounded-none px-8">
              <Search className="mr-2 h-4 w-4" /> Search parts
            </Button>
          </form>
          <p className="mt-3 text-xs text-steel-foreground/70">
            Example: 6205-2RS · HS-BV-400 · Guide vane bush
          </p>
        </div>
      </section>

      {/* Quick actions */}
      <section className="mx-auto -mt-px max-w-[1400px] px-4">
        <div className="grid divide-y divide-border border border-border bg-card sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          {[
            { title: "Browse categories", text: "16 hydropower part families", to: "/categories" },
            { title: "Find a verified seller", text: "Compare suppliers and lead times", to: "/sellers" },
            { title: "Track your order", text: "Payment to delivery timeline", to: "/orders" },
          ].map((a) => (
            <Link key={a.title} to={a.to} className="group p-5 hover:bg-secondary">
              <h2 className="section-title text-sm group-hover:text-primary">{a.title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{a.text}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Categories */}
      <section className="mx-auto max-w-[1400px] px-4 py-12">
        <div className="mb-4 flex items-end justify-between">
          <h2 className="section-title text-2xl">Shop by category</h2>
          <Link to="/categories" className="text-sm font-medium text-primary hover:underline">
            View all
          </Link>
        </div>
        <div className="grid gap-px bg-border sm:grid-cols-2 lg:grid-cols-4">
          {categories.slice(0, 12).map((c) => (
            <Link
              key={c.id}
              to="/category/$slug"
              params={{ slug: c.slug }}
              className="bg-card p-4 hover:bg-secondary"
            >
              <h3 className="text-sm font-semibold">{c.name}</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                {(c.children ?? []).slice(0, 3).map((s) => s.name).join(" · ")}
              </p>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured */}
      <section className="border-y border-border bg-card py-12">
        <div className="mx-auto max-w-[1400px] px-4">
          <div className="mb-4 flex items-end justify-between">
            <h2 className="section-title text-2xl">Featured parts</h2>
            <Link to="/products" search={{ q: "" }} className="text-sm font-medium text-primary hover:underline">
              All products
            </Link>
          </div>
          {featured.isLoading ? (
            <LoadingGrid />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {featured.data?.data.map((item) => <ProductCard key={item.product.id} item={item} />)}
            </div>
          )}
        </div>
      </section>

      {/* Why */}
      <section className="mx-auto max-w-[1400px] px-4 py-12">
        <h2 className="section-title text-2xl">Why Hydro Sathi</h2>
        <div className="mt-4 grid gap-px bg-border sm:grid-cols-2 lg:grid-cols-4">
          {WHY.map((w) => (
            <div key={w.title} className="bg-card p-5">
              <w.icon className="h-6 w-6 text-primary" />
              <h3 className="mt-3 text-sm font-semibold">{w.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{w.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="bg-secondary py-12">
        <div className="mx-auto max-w-[1400px] px-4">
          <h2 className="section-title text-2xl">How it works</h2>
          <ol className="mt-4 grid gap-4 md:grid-cols-4">
            {STEPS.map((s, i) => (
              <li key={s.title} className="border border-border bg-card p-5">
                <span className="part-no text-primary">STEP 0{i + 1}</span>
                <s.icon className="mt-3 h-6 w-6 text-foreground" />
                <h3 className="mt-3 text-sm font-semibold">{s.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{s.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* New products */}
      <section className="mx-auto max-w-[1400px] px-4 py-12">
        <h2 className="section-title mb-4 text-2xl">Recently added</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {newest.data?.data.map((item) => <ProductCard key={item.product.id} item={item} />)}
        </div>
      </section>

      {/* Sellers */}
      <section className="border-y border-border bg-card py-12">
        <div className="mx-auto max-w-[1400px] px-4">
          <div className="mb-4 flex items-end justify-between">
            <h2 className="section-title text-2xl">Verified sellers</h2>
            <Link to="/sellers" className="text-sm font-medium text-primary hover:underline">
              View all sellers
            </Link>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {sellers.map((s) => (
              <div key={s.id} className="border border-border p-5">
                <div className="flex items-center gap-2">
                  <BadgeCheck className="h-4 w-4 text-success" />
                  <h3 className="text-sm font-semibold">{s.businessName}</h3>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{s.description}</p>
                <p className="mt-3 part-no text-muted-foreground">
                  {s.city}, {s.province} · {s.totalProducts} parts · ★ {s.rating}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Seller CTA */}
      <section className="mx-auto max-w-[1400px] px-4 py-12">
        <div className="flex flex-col items-start justify-between gap-4 bg-steel p-8 text-steel-foreground md:flex-row md:items-center">
          <div>
            <h2 className="section-title text-2xl">Sell hydropower spares on Hydro Sathi</h2>
            <p className="mt-2 max-w-xl text-sm text-steel-foreground/75">
              Register your business, upload your documents and start listing once approved. Transparent commission,
              order-level settlement reports.
            </p>
          </div>
          <Button asChild size="lg" className="rounded-none">
            <Link to="/seller/register">Become a seller</Link>
          </Button>
        </div>
      </section>
    </SiteLayout>
  );
}
