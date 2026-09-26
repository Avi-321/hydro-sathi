import { useEffect, type ReactNode } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Loader2, LogOut } from "lucide-react";
import { Logo } from "./Logo";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { actions } from "@/lib/store";

export interface PortalNavItem {
  label: string;
  to: string;
}

export function PortalLayout({
  title,
  subtitle,
  nav,
  badge,
  children,
}: {
  title: string;
  subtitle?: string;
  nav: PortalNavItem[];
  badge: string;
  children: ReactNode;
}) {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const requiredRole: "ADMIN" | "SELLER" = nav[0]?.to.startsWith("/admin") ? "ADMIN" : "SELLER";
  const allowed = user?.role === requiredRole;

  useEffect(() => {
    if (loading || allowed) return;
    navigate({ to: requiredRole === "ADMIN" ? "/admin/login" : "/signin", replace: true });
  }, [loading, allowed, requiredRole, navigate]);

  if (loading || !allowed) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden w-60 shrink-0 flex-col bg-sidebar text-sidebar-foreground lg:flex">
        <div className="border-b border-sidebar-border p-4">
          <Link to="/">
            <Logo />
          </Link>
          <span className="mt-3 inline-block bg-sidebar-primary px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-sidebar-primary-foreground">
            {badge}
          </span>
        </div>
        <nav className="flex flex-1 flex-col gap-0.5 p-2">
          {nav.map((item) => (
            <Link
              key={item.to}
              to={item.to as never}
              className="px-3 py-2 text-sm text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              activeProps={{ className: "bg-sidebar-accent text-sidebar-accent-foreground font-semibold" }}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="space-y-1 border-t border-sidebar-border p-3">
          <p className="px-3 pb-1 text-xs text-sidebar-foreground/70">{user.email}</p>
          <Button asChild variant="ghost" size="sm" className="w-full justify-start text-sidebar-foreground/70">
            <Link to="/">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to storefront
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-sidebar-foreground/70"
            onClick={async () => {
              await actions.signOut();
              navigate({ to: requiredRole === "ADMIN" ? "/admin/login" : "/signin", replace: true });
            }}
          >
            <LogOut className="mr-2 h-4 w-4" /> Sign out
          </Button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="border-b border-border bg-card px-4 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="section-title text-xl">{title}</h1>
              {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
            </div>
            <span className="hidden bg-secondary px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-secondary-foreground lg:hidden">
              {badge}
            </span>
          </div>
          <nav className="mt-3 flex gap-1 overflow-x-auto lg:hidden">
            {nav.map((item) => (
              <Link
                key={item.to}
                to={item.to as never}
                className="whitespace-nowrap border border-border px-3 py-1.5 text-xs"
                activeProps={{ className: "bg-primary text-primary-foreground border-primary" }}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </header>
        <main className="flex-1 p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}

export const SELLER_NAV: PortalNavItem[] = [
  { label: "Dashboard", to: "/seller/dashboard" },
  { label: "Products", to: "/seller/products" },
  { label: "Orders", to: "/seller/orders" },
  { label: "Revenue", to: "/seller/revenue" },
  { label: "Profile", to: "/seller/profile" },
  { label: "Help & support", to: "/support" },
];

export const ADMIN_NAV: PortalNavItem[] = [
  { label: "Dashboard", to: "/admin/dashboard" },
  { label: "Sellers", to: "/admin/sellers" },
  { label: "Products", to: "/admin/products" },
  { label: "Categories", to: "/admin/categories" },
  { label: "Orders", to: "/admin/orders" },
  { label: "Commission", to: "/admin/commission" },
  { label: "Payments", to: "/admin/payments" },
  { label: "Support", to: "/admin/support" },
];
