import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Heart, LogOut, Menu, Phone, Search, ShoppingCart, User2 } from "lucide-react";
import { useState } from "react";
import { Logo } from "./Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { catalogueApi } from "@/lib/api";
import { actions, useAppState } from "@/lib/store";

export function SiteHeader() {
  const navigate = useNavigate();
  const { user, cart, wishlist } = useAppState();
  const [term, setTerm] = useState("");
  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: catalogueApi.listCategories,
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    navigate({ to: "/products", search: { q: term || undefined } });
  };

  const cartCount = cart.reduce((s, i) => s + i.quantity, 0);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-card">
      <div className="bg-steel text-steel-foreground">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between px-4 py-1.5 text-xs">
          <span className="hidden sm:inline">Verified sellers · Genuine hydropower spare parts across Nepal</span>
          <span className="flex items-center gap-4">
            <Link to="/sell-on-hydro-sathi" className="hover:text-primary">
              Sell on Hydro Sathi
            </Link>
            <span className="hidden items-center gap-1 md:flex">
              <Phone className="h-3 w-3" /> +977 1 5970111
            </span>
          </span>
        </div>
      </div>

      <div className="mx-auto flex max-w-[1400px] items-center gap-3 px-4 py-3">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open menu">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-80 overflow-y-auto">
            <nav className="mt-8 flex flex-col gap-1">
              {categories.map((c) => (
                <Link
                  key={c.id}
                  to="/category/$slug"
                  params={{ slug: c.slug }}
                  className="border-b border-border py-2 text-sm"
                >
                  {c.name}
                </Link>
              ))}
            </nav>
          </SheetContent>
        </Sheet>

        <Link to="/" className="shrink-0">
          <Logo />
        </Link>

        <form onSubmit={submit} className="relative mx-auto hidden w-full max-w-2xl md:block">
          <Input
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Search part number, OEM number, product or category"
            className="h-11 rounded-none pr-24"
            aria-label="Search parts"
          />
          <Button type="submit" className="absolute right-0 top-0 h-11 rounded-none px-5">
            <Search className="mr-1 h-4 w-4" /> Search
          </Button>
        </form>

        <div className="ml-auto flex items-center gap-1">
          <Button asChild variant="ghost" size="icon" aria-label="Wishlist">
            <Link to="/wishlist">
              <span className="relative">
                <Heart className="h-5 w-5" />
                {wishlist.length > 0 && (
                  <span className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center bg-accent px-1 text-[10px] font-bold text-accent-foreground">
                    {wishlist.length}
                  </span>
                )}
              </span>
            </Link>
          </Button>
          <Button asChild variant="ghost" size="icon" aria-label="Cart">
            <Link to="/cart">
              <span className="relative">
                <ShoppingCart className="h-5 w-5" />
                {cartCount > 0 && (
                  <span className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center bg-accent px-1 text-[10px] font-bold text-accent-foreground">
                    {cartCount}
                  </span>
                )}
              </span>
            </Link>
          </Button>

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Account">
                  <User2 className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  {user.fullName}
                  <span className="block text-xs font-normal text-muted-foreground">{user.email}</span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/orders">My orders</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/wishlist">Wishlist</Link>
                </DropdownMenuItem>
                {user.role === "SELLER" && (
                  <DropdownMenuItem asChild>
                    <Link to="/seller/dashboard">Seller portal</Link>
                  </DropdownMenuItem>
                )}
                {user.role === "ADMIN" && (
                  <DropdownMenuItem asChild>
                    <Link to="/admin/dashboard">Admin panel</Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => { void actions.signOut(); navigate({ to: "/signin" }); }}>
                  <LogOut className="mr-2 h-4 w-4" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="ml-1 hidden items-center gap-2 sm:flex">
              <Button asChild variant="outline" size="sm" className="rounded-none">
                <Link to="/signin">Sign In</Link>
              </Button>
              <Button asChild size="sm" className="rounded-none">
                <Link to="/signup">Sign Up</Link>
              </Button>
            </div>
          )}
        </div>
      </div>

      <form onSubmit={submit} className="border-t border-border px-4 py-2 md:hidden">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Search part number or product"
            className="h-9 rounded-none pl-9"
            aria-label="Search parts"
          />
        </div>
      </form>

      <nav className="hidden border-t border-border bg-secondary lg:block">
        <div className="mx-auto flex max-w-[1400px] items-center gap-1 overflow-x-auto px-4">
          {categories.slice(0, 9).map((c) => (
            <Link
              key={c.id}
              to="/category/$slug"
              params={{ slug: c.slug }}
              className="whitespace-nowrap px-3 py-2.5 text-[13px] font-medium uppercase tracking-wide text-secondary-foreground hover:bg-primary hover:text-primary-foreground"
              activeProps={{ className: "bg-primary text-primary-foreground" }}
            >
              {c.name}
            </Link>
          ))}
          <Link
            to="/categories"
            className="whitespace-nowrap px-3 py-2.5 text-[13px] font-semibold uppercase tracking-wide text-primary"
          >
            All categories
          </Link>
        </div>
      </nav>
    </header>
  );
}
