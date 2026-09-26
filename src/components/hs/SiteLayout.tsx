import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { SiteHeader } from "./SiteHeader";
import { SiteFooter } from "./SiteFooter";

export interface Crumb {
  label: string;
  to?: string;
  params?: Record<string, string>;
}

export function SiteLayout({ children, crumbs }: { children: ReactNode; crumbs?: Crumb[] }) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      {crumbs && crumbs.length > 0 && (
        <div className="border-b border-border bg-card">
          <nav
            aria-label="Breadcrumb"
            className="mx-auto flex max-w-[1400px] flex-wrap items-center gap-1 px-4 py-2 text-xs text-muted-foreground"
          >
            <Link to="/" className="hover:text-primary">
              Home
            </Link>
            {crumbs.map((c) => (
              <span key={c.label} className="flex items-center gap-1">
                <ChevronRight className="h-3 w-3" />
                {c.to ? (
                  <Link to={c.to} params={c.params as never} className="hover:text-primary">
                    {c.label}
                  </Link>
                ) : (
                  <span className="text-foreground">{c.label}</span>
                )}
              </span>
            ))}
          </nav>
        </div>
      )}
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}
