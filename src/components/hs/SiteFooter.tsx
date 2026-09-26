import { Link } from "@tanstack/react-router";
import { Logo } from "./Logo";

const COLUMNS = [
  {
    title: "Marketplace",
    links: [
      { label: "All categories", to: "/categories" },
      { label: "All products", to: "/products" },
      { label: "Verified sellers", to: "/sellers" },
      { label: "Track your order", to: "/orders" },
    ],
  },
  {
    title: "Sellers",
    links: [
      { label: "Sell on Hydro Sathi", to: "/sell-on-hydro-sathi" },
      { label: "Seller registration", to: "/seller/register" },
      { label: "Seller portal", to: "/seller/dashboard" },
    ],
  },
  {
    title: "Support",
    links: [
      { label: "Help & support", to: "/support" },
      { label: "Sign in", to: "/signin" },
      { label: "Create account", to: "/signup" },
      { label: "Cart", to: "/cart" },
    ],
  },
] as const;

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-border bg-steel text-steel-foreground">
      <div className="mx-auto grid max-w-[1400px] gap-8 px-4 py-12 md:grid-cols-4">
        <div>
          <Logo />
          <p className="mt-4 max-w-xs text-sm text-steel-foreground/70">
            Nepal's marketplace for hydropower plant spare parts. Verified sellers, traceable part numbers,
            server-verified payments.
          </p>
        </div>
        {COLUMNS.map((col) => (
          <div key={col.title}>
            <h3 className="section-title mb-3 text-sm">{col.title}</h3>
            <ul className="space-y-2 text-sm text-steel-foreground/75">
              {col.links.map((l) => (
                <li key={l.label}>
                  <Link to={l.to} className="hover:text-primary">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-steel-foreground/15">
        <div className="mx-auto flex max-w-[1400px] flex-col gap-2 px-4 py-4 text-xs text-steel-foreground/60 sm:flex-row sm:items-center sm:justify-between">
          <span>© {new Date().getFullYear()} Hydro Sathi. All rights reserved.</span>
          <span>Payments via eSewa · Khalti · Bank transfer · COD (where enabled)</span>
        </div>
      </div>
    </footer>
  );
}
