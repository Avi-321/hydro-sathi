import { createFileRoute, Link } from "@tanstack/react-router";
import { Trash2 } from "lucide-react";
import { SiteLayout } from "@/components/hs/SiteLayout";
import { EmptyState } from "@/components/hs/StateBlocks";
import { Button } from "@/components/ui/button";
import { computeTotals } from "@/lib/api";
import { NPR } from "@/lib/format";
import { actions, useAppState } from "@/lib/store";

export const Route = createFileRoute("/cart")({
  head: () => ({
    meta: [
      { title: "Your Cart | Hydro Sathi" },
      { name: "description", content: "Review the hydropower spare parts in your Hydro Sathi cart before checkout." },
      { property: "og:title", content: "Your Cart | Hydro Sathi" },
      { property: "og:description", content: "Cart summary with delivery, VAT and grand total." },
    ],
  }),
  component: CartPage,
});

function CartPage() {
  const { cart, user } = useAppState();
  const totals = computeTotals(cart);

  return (
    <SiteLayout crumbs={[{ label: "Cart" }]}>
      <div className="mx-auto max-w-[1400px] px-4 py-8">
        <h1 className="section-title text-2xl">Your cart</h1>

        {cart.length === 0 ? (
          <div className="mt-6">
            <EmptyState
              title="Your cart is empty"
              description="Search a part number or browse categories to add hydropower spares."
              action={
                <Button asChild className="rounded-none">
                  <Link to="/products" search={{ q: "" }}>Browse parts</Link>
                </Button>
              }
            />
          </div>
        ) : (
          <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
            <div className="border border-border bg-card">
              {cart.map((item) => (
                <div key={item.listingId} className="flex gap-4 border-b border-border p-4 last:border-b-0">
                  <img
                    src={item.imageUrl}
                    alt={item.productName}
                    loading="lazy"
                    className="h-24 w-24 shrink-0 border border-border object-contain p-1 mix-blend-multiply"
                  />
                  <div className="min-w-0 flex-1">
                    <h2 className="text-sm font-semibold">{item.productName}</h2>
                    <p className="part-no text-muted-foreground">Part no. {item.partNumber}</p>
                    <p className="text-xs text-muted-foreground">Sold by {item.sellerName}</p>
                    <div className="mt-2 flex items-center gap-3">
                      <div className="flex items-center border border-input">
                        <button
                          className="px-2 py-1"
                          onClick={() => actions.updateQuantity(item.listingId, item.quantity - 1)}
                          aria-label="Decrease quantity"
                        >
                          −
                        </button>
                        <span className="w-8 text-center text-sm">{item.quantity}</span>
                        <button
                          className="px-2 py-1"
                          onClick={() => actions.updateQuantity(item.listingId, item.quantity + 1)}
                          aria-label="Increase quantity"
                        >
                          +
                        </button>
                      </div>
                      <span className="text-xs text-muted-foreground">{item.stockQuantity} in stock</span>
                      <button
                        className="ml-auto text-muted-foreground hover:text-destructive"
                        onClick={() => actions.removeFromCart(item.listingId)}
                        aria-label="Remove item"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{NPR(item.unitPrice * item.quantity)}</p>
                    <p className="text-xs text-muted-foreground">{NPR(item.unitPrice)} each</p>
                  </div>
                </div>
              ))}
            </div>

            <aside className="h-fit border border-border bg-card p-4">
              <h2 className="section-title text-sm">Order summary</h2>
              <dl className="mt-3 space-y-2 text-sm">
                {[
                  ["Subtotal", totals.subtotal],
                  ["Delivery charge", totals.deliveryCharge],
                  ["VAT (13%)", totals.taxAmount],
                  ["Discount", -totals.discountAmount],
                ].map(([label, value]) => (
                  <div key={label as string} className="flex justify-between">
                    <dt className="text-muted-foreground">{label}</dt>
                    <dd>{NPR(value as number)}</dd>
                  </div>
                ))}
                <div className="flex justify-between border-t border-border pt-2 font-display text-lg font-bold">
                  <dt>Grand total</dt>
                  <dd>{NPR(totals.grandTotal)}</dd>
                </div>
              </dl>
              <p className="mt-2 text-[11px] text-muted-foreground">
                Final amounts are recalculated and verified by the backend at checkout.
              </p>
              <Button asChild className="mt-4 w-full rounded-none">
                <Link to={user ? "/checkout" : "/signin"}>{user ? "Proceed to checkout" : "Sign in to checkout"}</Link>
              </Button>
            </aside>
          </div>
        )}
      </div>
    </SiteLayout>
  );
}
