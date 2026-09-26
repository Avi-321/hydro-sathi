import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { BadgeCheck, Heart, ShoppingCart, Truck } from "lucide-react";
import { toast } from "sonner";
import { SiteLayout } from "@/components/hs/SiteLayout";
import { StatusBadge } from "@/components/hs/StatusBadge";
import { EmptyState } from "@/components/hs/StateBlocks";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { catalogueApi, sellerName } from "@/lib/api";
import { NPR } from "@/lib/format";
import { actions, useAppState } from "@/lib/store";

export const Route = createFileRoute("/product/$slug")({
  head: ({ params }) => {
    const name = params.slug.replace(/-/g, " ");
    return {
      meta: [
        { title: `${name} | Hydro Sathi` },
        {
          name: "description",
          content: `Specifications, compatibility and verified seller offers for ${name} on Hydro Sathi Nepal.`,
        },
        { property: "og:title", content: `${name} | Hydro Sathi` },
        { property: "og:description", content: `Compare verified seller prices and stock for ${name}.` },
      ],
    };
  },
  component: ProductPage,
});

function ProductPage() {
  const { slug } = Route.useParams();
  const navigate = useNavigate();
  const { user, wishlist } = useAppState();
  const [activeImage, setActiveImage] = useState(0);
  const [selectedListing, setSelectedListing] = useState<number | null>(null);
  const [qty, setQty] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["product", slug],
    queryFn: () => catalogueApi.getProductBySlug(slug),
  });

  if (isLoading) {
    return (
      <SiteLayout>
        <div className="mx-auto grid max-w-[1400px] gap-6 px-4 py-8 lg:grid-cols-2">
          <Skeleton className="aspect-square rounded-none" />
          <Skeleton className="h-96 rounded-none" />
        </div>
      </SiteLayout>
    );
  }

  if (!data) {
    return (
      <SiteLayout crumbs={[{ label: "Product" }]}>
        <div className="mx-auto max-w-[1400px] px-4 py-12">
          <EmptyState title="Part not found" description="This part is no longer listed or the link is incorrect." />
        </div>
      </SiteLayout>
    );
  }

  const { product, listings } = data;
  const listing = listings.find((l) => l.id === selectedListing) ?? data.bestListing;
  const inStock = (listing?.stockQuantity ?? 0) > 0;

  const addToCart = (buyNow = false) => {
    if (!user) {
      toast.error("Please sign in to continue");
      navigate({ to: "/signin" });
      return;
    }
    if (!listing) return;
    actions.addToCart({
      listingId: listing.id,
      productId: product.id,
      quantity: qty,
      unitPrice: listing.price,
      productName: product.name,
      partNumber: product.partNumber,
      sellerId: listing.sellerId,
      sellerName: sellerName(listing.sellerId),
      imageUrl: product.images[0]?.imageUrl ?? "",
      stockQuantity: listing.stockQuantity,
    });
    toast.success("Added to cart");
    navigate({ to: buyNow ? "/checkout" : "/cart" });
  };

  return (
    <SiteLayout
      crumbs={[
        { label: "Categories", to: "/categories" },
        { label: data.categoryName },
        { label: product.partNumber },
      ]}
    >
      <div className="mx-auto max-w-[1400px] px-4 py-6">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,480px)_1fr]">
          {/* Images */}
          <div>
            <div className="border border-border bg-card">
              <img
                src={product.images[activeImage]?.imageUrl}
                alt={product.images[activeImage]?.altText ?? product.name}
                width={800}
                height={800}
                className="aspect-square w-full object-contain p-6 mix-blend-multiply"
              />
            </div>
            <div className="mt-2 flex gap-2">
              {product.images.map((img, i) => (
                <button
                  key={img.id}
                  onClick={() => setActiveImage(i)}
                  className={`h-20 w-20 border ${i === activeImage ? "border-primary" : "border-border"} bg-card`}
                  aria-label={`View image ${i + 1}`}
                >
                  <img src={img.imageUrl} alt={img.altText} className="h-full w-full object-contain p-1 mix-blend-multiply" />
                </button>
              ))}
            </div>
          </div>

          {/* Summary */}
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="bg-steel px-2 py-1 part-no text-steel-foreground">{product.partNumber}</span>
              <StatusBadge status={inStock ? "ACTIVE" : "PENDING"} />
              {listing && <StatusBadge status={listing.condition === "NEW" ? "VERIFIED" : "PENDING"} />}
            </div>
            <h1 className="mt-3 font-display text-3xl font-bold">{product.name}</h1>
            <p className="mt-2 text-sm text-muted-foreground">{product.shortDescription}</p>

            <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 border-y border-border py-4 text-sm">
              {[
                ["OEM number", product.oemNumber ?? "—"],
                ["SKU", product.sku],
                ["Product code", product.productCode ?? "—"],
                ["Category", data.categoryName],
                ["Brand", data.brandName ?? "—"],
                ["Manufacturer", data.manufacturerName ?? "—"],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">{k}</dt>
                  <dd className="text-right font-medium">{v}</dd>
                </div>
              ))}
            </dl>

            {listing ? (
              <div className="mt-4 border border-border bg-card p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-display text-3xl font-bold">{NPR(listing.price)}</p>
                    <p className="text-xs text-muted-foreground">
                      Inclusive of seller margin · VAT calculated at checkout
                    </p>
                  </div>
                  <div className="text-right text-sm">
                    <p className="flex items-center justify-end gap-1 font-medium">
                      <BadgeCheck className="h-4 w-4 text-success" /> {sellerName(listing.sellerId)}
                    </p>
                    <p className="text-muted-foreground">
                      {inStock ? `${listing.stockQuantity} in stock` : "Out of stock"}
                    </p>
                    <p className="flex items-center justify-end gap-1 text-muted-foreground">
                      <Truck className="h-3 w-3" /> Delivery in {listing.leadTimeDays} days
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <div className="flex items-center border border-input">
                    <button className="px-3 py-2" onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Decrease">
                      −
                    </button>
                    <span className="w-10 text-center text-sm">{qty}</span>
                    <button
                      className="px-3 py-2"
                      onClick={() => setQty((q) => Math.min(listing.stockQuantity || 1, q + 1))}
                      aria-label="Increase"
                    >
                      +
                    </button>
                  </div>
                  <Button className="rounded-none" disabled={!inStock} onClick={() => addToCart(false)}>
                    <ShoppingCart className="mr-2 h-4 w-4" /> Add to Cart
                  </Button>
                  <Button variant="secondary" className="rounded-none" disabled={!inStock} onClick={() => addToCart(true)}>
                    Buy Now
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="rounded-none"
                    aria-label="Wishlist"
                    onClick={() => {
                      if (!user) {
                        navigate({ to: "/signin" });
                        return;
                      }
                      actions.toggleWishlist(product.id);
                      toast.success("Wishlist updated");
                    }}
                  >
                    <Heart className={wishlist.includes(product.id) ? "h-4 w-4 fill-accent text-accent" : "h-4 w-4"} />
                  </Button>
                </div>
              </div>
            ) : (
              <EmptyState title="No active seller offer" description="Submit a procurement request to receive quotes." />
            )}

            {listings.length > 1 && (
              <div className="mt-6">
                <h2 className="section-title mb-2 text-sm">Compare {listings.length} seller offers</h2>
                <Table className="border border-border bg-card">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Seller</TableHead>
                      <TableHead>Condition</TableHead>
                      <TableHead>Lead time</TableHead>
                      <TableHead>Stock</TableHead>
                      <TableHead className="text-right">Price</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {listings.map((l) => (
                      <TableRow key={l.id} className={l.id === listing?.id ? "bg-primary/5" : ""}>
                        <TableCell className="font-medium">{sellerName(l.sellerId)}</TableCell>
                        <TableCell>{l.condition}</TableCell>
                        <TableCell>{l.leadTimeDays} days</TableCell>
                        <TableCell>{l.stockQuantity}</TableCell>
                        <TableCell className="text-right font-semibold">{NPR(l.price)}</TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant="outline" className="rounded-none" onClick={() => setSelectedListing(l.id)}>
                            Select
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </div>

        {/* Details tabs */}
        <Tabs defaultValue="specs" className="mt-10">
          <TabsList className="rounded-none">
            <TabsTrigger value="specs">Specifications</TabsTrigger>
            <TabsTrigger value="description">Description</TabsTrigger>
            <TabsTrigger value="compat">Compatibility</TabsTrigger>
            <TabsTrigger value="seller">Seller information</TabsTrigger>
          </TabsList>
          <TabsContent value="specs" className="border border-border bg-card p-4">
            <dl className="grid gap-x-8 gap-y-2 sm:grid-cols-2">
              {Object.entries(product.specifications).map(([k, v]) => (
                <div key={k} className="flex justify-between border-b border-border py-1.5 text-sm">
                  <dt className="text-muted-foreground">{k}</dt>
                  <dd className="font-medium">{v}</dd>
                </div>
              ))}
              <div className="flex justify-between border-b border-border py-1.5 text-sm">
                <dt className="text-muted-foreground">Weight</dt>
                <dd className="font-medium">{product.weightKg} kg</dd>
              </div>
            </dl>
          </TabsContent>
          <TabsContent value="description" className="border border-border bg-card p-4 text-sm leading-relaxed">
            {product.description}
          </TabsContent>
          <TabsContent value="compat" className="border border-border bg-card p-4">
            <ul className="list-inside list-disc space-y-1 text-sm">
              {product.compatibility.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          </TabsContent>
          <TabsContent value="seller" className="border border-border bg-card p-4 text-sm">
            {listing ? (
              <div className="space-y-1">
                <p className="font-semibold">{sellerName(listing.sellerId)}</p>
                <p className="text-muted-foreground">
                  Verified seller · Minimum order {listing.minimumOrderQuantity} pc · Seller SKU {listing.sellerSku}
                </p>
                <p className="text-muted-foreground">
                  Seller ratings, returns and settlement are handled by Hydro Sathi admin.
                </p>
              </div>
            ) : (
              "No seller assigned."
            )}
          </TabsContent>
        </Tabs>
      </div>
    </SiteLayout>
  );
}
