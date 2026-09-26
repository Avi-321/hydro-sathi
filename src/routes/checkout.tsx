import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { ShieldCheck } from "lucide-react";
import { SiteLayout } from "@/components/hs/SiteLayout";
import { EmptyState } from "@/components/hs/StateBlocks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { computeTotals, orderApi, paymentApi } from "@/lib/api";
import { NPR } from "@/lib/format";
import { actions, useAppState } from "@/lib/store";
import type { PaymentProvider } from "@/lib/types";

export const Route = createFileRoute("/checkout")({
  head: () => ({
    meta: [
      { title: "Checkout | Hydro Sathi" },
      { name: "description", content: "Enter delivery details and pay with eSewa, Khalti or approved COD." },
      { property: "og:title", content: "Checkout | Hydro Sathi" },
      { property: "og:description", content: "Server-verified payments for hydropower spare part orders." },
    ],
  }),
  component: CheckoutPage,
});

const schema = z.object({
  fullName: z.string().trim().min(2, "Required").max(100),
  phone: z.string().trim().min(7, "Enter a valid phone").max(20),
  addressLine1: z.string().trim().min(4, "Required").max(200),
  province: z.string().trim().min(2, "Required").max(60),
  district: z.string().trim().min(2, "Required").max(60),
  city: z.string().trim().min(2, "Required").max(60),
  notes: z.string().max(500).optional(),
});

const METHODS: { id: PaymentProvider; label: string; note: string }[] = [
  { id: "ESEWA", label: "eSewa", note: "Redirect to eSewa; payment verified server-side." },
  { id: "KHALTI", label: "Khalti", note: "Khalti checkout with server-side lookup verification." },
  { id: "COD", label: "Cash on delivery", note: "Available only when enabled by admin for your account." },
];

function CheckoutPage() {
  const navigate = useNavigate();
  const { cart, user } = useAppState();
  const totals = computeTotals(cart);
  const [method, setMethod] = useState<PaymentProvider>("ESEWA");
  const [form, setForm] = useState({
    fullName: "",
    phone: "",
    addressLine1: "",
    province: "",
    district: "",
    city: "",
    notes: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  if (!user) {
    return (
      <SiteLayout crumbs={[{ label: "Checkout" }]}>
        <div className="mx-auto max-w-2xl px-4 py-12">
          <EmptyState
            title="Sign in required"
            description="You must be signed in to place an order."
            action={
              <Button asChild className="rounded-none">
                <Link to="/signin">Sign in</Link>
              </Button>
            }
          />
        </div>
      </SiteLayout>
    );
  }

  if (cart.length === 0) {
    return (
      <SiteLayout crumbs={[{ label: "Checkout" }]}>
        <div className="mx-auto max-w-2xl px-4 py-12">
          <EmptyState title="Nothing to check out" description="Your cart is empty." />
        </div>
      </SiteLayout>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      setErrors(Object.fromEntries(parsed.error.issues.map((i) => [i.path[0], i.message])));
      return;
    }
    setErrors({});
    setSubmitting(true);
    try {
      const d = parsed.data;
      const res = await orderApi.createOrder({
        shipping: {
          buyerName: d.fullName,
          buyerPhone: d.phone,
          buyerEmail: user.email,
          province: d.province,
          district: d.district,
          city: d.city,
          street: d.addressLine1,
        },
        paymentProvider: method,
        ...(d.notes ? { notes: d.notes } : {}),
      });
      await actions.clearCart();
      toast.success(`Order ${res.orderNumber} created`);

      if (method === "ESEWA" || method === "KHALTI") {
        const init = await paymentApi.initiate(res.orderNumber, method);
        if (init.paymentUrl) {
          window.location.href = init.paymentUrl;
          return;
        }
        if (init.formUrl && init.fields) {
          const f = document.createElement("form");
          f.method = "POST";
          f.action = init.formUrl;
          Object.entries(init.fields).forEach(([k, v]) => {
            const i = document.createElement("input");
            i.type = "hidden";
            i.name = k;
            i.value = String(v);
            f.appendChild(i);
          });
          document.body.appendChild(f);
          f.submit();
          return;
        }
      }
      navigate({ to: "/orders" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not place the order");
    } finally {
      setSubmitting(false);
    }
  };

  const field = (name: keyof typeof form, label: string) => (
    <div>
      <Label htmlFor={name}>{label}</Label>
      <Input
        id={name}
        className="mt-1 rounded-none"
        value={form[name]}
        onChange={(e) => setForm({ ...form, [name]: e.target.value })}
      />
      {errors[name] && <p className="mt-1 text-xs text-destructive">{errors[name]}</p>}
    </div>
  );

  return (
    <SiteLayout crumbs={[{ label: "Cart", to: "/cart" }, { label: "Checkout" }]}>
      <div className="mx-auto max-w-[1400px] px-4 py-8">
        <h1 className="section-title text-2xl">Checkout</h1>
        <form onSubmit={submit} className="mt-6 grid gap-6 lg:grid-cols-[1fr_380px]" noValidate>
          <div className="space-y-6">
            <section className="border border-border bg-card p-4">
              <h2 className="section-title text-sm">Delivery address</h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {field("fullName", "Contact name")}
                {field("phone", "Phone")}
                <div className="sm:col-span-2">{field("addressLine1", "Address / site location")}</div>
                {field("province", "Province")}
                {field("district", "District")}
                {field("city", "City / municipality")}
              </div>
              <div className="mt-4">
                <Label htmlFor="notes">Delivery notes (optional)</Label>
                <Textarea
                  id="notes"
                  className="mt-1 rounded-none"
                  maxLength={500}
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                />
              </div>
            </section>

            <section className="border border-border bg-card p-4">
              <h2 className="section-title text-sm">Payment method</h2>
              <div className="mt-3 space-y-2">
                {METHODS.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setMethod(m.id)}
                    className={`flex w-full items-start gap-3 border p-3 text-left ${
                      method === m.id ? "border-primary bg-primary/5" : "border-border"
                    }`}
                  >
                    <span
                      className={`mt-1 h-3 w-3 shrink-0 rounded-full border ${
                        method === m.id ? "border-primary bg-primary" : "border-muted-foreground"
                      }`}
                    />
                    <span>
                      <span className="block text-sm font-semibold">{m.label}</span>
                      <span className="block text-xs text-muted-foreground">{m.note}</span>
                    </span>
                  </button>
                ))}
              </div>
              <p className="mt-3 flex items-start gap-2 text-xs text-muted-foreground">
                <ShieldCheck className="mt-0.5 h-4 w-4 text-success" />
                Hydro Sathi never marks an order as paid from the browser. Payment status is set only after the
                provider webhook is verified by the backend.
              </p>
            </section>
          </div>

          <aside className="h-fit border border-border bg-card p-4">
            <h2 className="section-title text-sm">Order summary</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {cart.map((i) => (
                <li key={i.listingId} className="flex justify-between gap-2">
                  <span className="min-w-0">
                    <span className="block truncate">{i.productName}</span>
                    <span className="part-no text-muted-foreground">
                      {i.partNumber} × {i.quantity}
                    </span>
                  </span>
                  <span>{NPR(i.unitPrice * i.quantity)}</span>
                </li>
              ))}
            </ul>
            <dl className="mt-4 space-y-2 border-t border-border pt-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Subtotal</dt>
                <dd>{NPR(totals.subtotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Delivery</dt>
                <dd>{NPR(totals.deliveryCharge)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">VAT (13%)</dt>
                <dd>{NPR(totals.taxAmount)}</dd>
              </div>
              <div className="flex justify-between border-t border-border pt-2 font-display text-lg font-bold">
                <dt>Total payable</dt>
                <dd>{NPR(totals.grandTotal)}</dd>
              </div>
            </dl>
            <Button type="submit" className="mt-4 w-full rounded-none" disabled={submitting}>
              {submitting ? "Creating order…" : `Pay with ${METHODS.find((m) => m.id === method)?.label}`}
            </Button>
          </aside>
        </form>
      </div>
    </SiteLayout>
  );
}
