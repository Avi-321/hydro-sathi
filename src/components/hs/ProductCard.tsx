import { Link, useNavigate } from "@tanstack/react-router";
import { Heart, ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "./StatusBadge";
import { NPR } from "@/lib/format";
import { sellerName } from "@/lib/api";
import { actions, useAppState } from "@/lib/store";
import type { CatalogueItem } from "@/lib/types";
import { cn } from "@/lib/utils";

export function ProductCard({ item, className }: { item: CatalogueItem; className?: string }) {
  const navigate = useNavigate();
  const { user, wishlist } = useAppState();
  const { product, bestListing, listings } = item;
  const image = product.images.find((i) => i.isPrimary) ?? product.images[0];
  const inStock = (bestListing?.stockQuantity ?? 0) > 0;

  const requireAuth = (action: () => void) => {
    if (!user) {
      toast.error("Please sign in to continue");
      navigate({ to: "/signin" });
      return;
    }
    action();
  };

  return (
    <article
      className={cn(
        "group flex flex-col border border-border bg-card transition-colors hover:border-primary",
        className,
      )}
    >
      <Link to="/product/$slug" params={{ slug: product.slug }} className="relative block bg-secondary">
        <img
          src={image?.imageUrl}
          alt={image?.altText ?? product.name}
          loading="lazy"
          width={800}
          height={800}
          className="aspect-square w-full object-contain p-4 mix-blend-multiply"
        />
        <span className="absolute left-0 top-0 bg-steel px-2 py-1 part-no text-steel-foreground">
          {product.partNumber}
        </span>
      </Link>

      <div className="flex flex-1 flex-col gap-2 border-t border-border p-3">
        <Link to="/product/$slug" params={{ slug: product.slug }}>
          <h3 className="line-clamp-2 text-sm font-semibold leading-snug hover:text-primary">{product.name}</h3>
        </Link>
        <dl className="space-y-0.5 text-xs text-muted-foreground">
          <div className="flex justify-between gap-2">
            <dt>OEM</dt>
            <dd className="part-no text-foreground">{product.oemNumber ?? "—"}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt>Manufacturer</dt>
            <dd className="truncate text-foreground">{item.manufacturerName ?? "—"}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt>Seller</dt>
            <dd className="truncate text-foreground">
              {bestListing ? sellerName(bestListing.sellerId) : "—"}
            </dd>
          </div>
        </dl>

        <div className="mt-auto pt-2">
          <div className="flex items-end justify-between">
            <div>
              <p className="font-display text-lg font-bold">{bestListing ? NPR(bestListing.price) : "On request"}</p>
              {listings.length > 1 && (
                <p className="text-[11px] text-muted-foreground">{listings.length} sellers offering</p>
              )}
            </div>
            <StatusBadge status={inStock ? "ACTIVE" : "PENDING"} className={inStock ? "" : ""} />
          </div>

          <div className="mt-3 flex gap-2">
            <Button
              className="h-9 flex-1 rounded-none"
              disabled={!inStock}
              onClick={() =>
                requireAuth(() => {
                  if (!bestListing) return;
                  actions.addToCart({
                    listingId: bestListing.id,
                    productId: product.id,
                    quantity: 1,
                    unitPrice: bestListing.price,
                    productName: product.name,
                    partNumber: product.partNumber,
                    sellerId: bestListing.sellerId,
                    sellerName: sellerName(bestListing.sellerId),
                    imageUrl: image?.imageUrl ?? "",
                    stockQuantity: bestListing.stockQuantity,
                  });
                  toast.success("Added to cart");
                })
              }
            >
              <ShoppingCart className="mr-1 h-4 w-4" /> {inStock ? "Add to Cart" : "Out of stock"}
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9 rounded-none"
              aria-label="Add to wishlist"
              onClick={() =>
                requireAuth(() => {
                  actions.toggleWishlist(product.id);
                  toast.success("Wishlist updated");
                })
              }
            >
              <Heart className={cn("h-4 w-4", wishlist.includes(product.id) && "fill-accent text-accent")} />
            </Button>
          </div>
        </div>
      </div>
    </article>
  );
}
