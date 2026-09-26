import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { SiteLayout } from "@/components/hs/SiteLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supportApi } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatDate } from "@/lib/format";

export const Route = createFileRoute("/support")({
  head: () => ({
    meta: [
      { title: "Help & Support | Hydro Sathi" },
      {
        name: "description",
        content: "Raise a query about orders, payments, products or your seller account. Our team replies by email.",
      },
      { property: "og:title", content: "Help & Support | Hydro Sathi" },
      { property: "og:description", content: "Contact the Hydro Sathi support desk." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SupportPage,
});

const CATEGORIES = [
  { value: "GENERAL", label: "General enquiry" },
  { value: "ORDER", label: "Order issue" },
  { value: "PAYMENT", label: "Payment or refund" },
  { value: "PRODUCT", label: "Product or listing" },
  { value: "SELLER_ACCOUNT", label: "Seller account" },
  { value: "TECHNICAL", label: "Technical problem" },
];

function SupportPage() {
  const { user } = useAuth();
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState<string | null>(null);

  const { data: history = [], refetch } = useQuery({
    queryKey: ["support", "mine"],
    queryFn: supportApi.mine,
    enabled: Boolean(user),
  });

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setSending(true);
    try {
      const res = await supportApi.submit({
        name: String(f.get("name") ?? ""),
        email: String(f.get("email") ?? ""),
        phone: String(f.get("phone") ?? ""),
        category: String(f.get("category") ?? "GENERAL"),
        subject: String(f.get("subject") ?? ""),
        message: String(f.get("message") ?? ""),
        orderNumber: String(f.get("orderNumber") ?? ""),
      });
      setSent(res.ticketNumber);
      toast.success(`Request received — reference ${res.ticketNumber}`);
      e.currentTarget.reset();
      if (user) refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send your request");
    } finally {
      setSending(false);
    }
  };

  return (
    <SiteLayout crumbs={[{ label: "Help & support" }]}>
      <div className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="section-title text-2xl">Help &amp; support</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Buyers, sellers and visitors can raise a request here. It reaches the Hydro Sathi admin team by email and you
          get the reply at the address you give below.
        </p>

        {sent && (
          <div className="mt-4 border border-border bg-card p-4 text-sm">
            Your request <strong>{sent}</strong> has been logged. We usually reply within one business day.
          </div>
        )}

        <form onSubmit={submit} className="mt-6 space-y-4 border border-border bg-card p-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="s-name">Your name</Label>
              <Input id="s-name" name="name" required minLength={2} maxLength={120} defaultValue={user?.fullName ?? ""} className="mt-1 rounded-none" />
            </div>
            <div>
              <Label htmlFor="s-email">Email</Label>
              <Input id="s-email" name="email" type="email" required maxLength={190} defaultValue={user?.email ?? ""} className="mt-1 rounded-none" />
            </div>
            <div>
              <Label htmlFor="s-phone">Phone (optional)</Label>
              <Input id="s-phone" name="phone" maxLength={20} className="mt-1 rounded-none" />
            </div>
            <div>
              <Label htmlFor="s-cat">Topic</Label>
              <select id="s-cat" name="category" className="mt-1 w-full border border-input bg-background px-2 py-2 text-sm">
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="s-order">Order number (optional)</Label>
              <Input id="s-order" name="orderNumber" maxLength={40} placeholder="HS-000123" className="mt-1 rounded-none" />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="s-subject">Subject</Label>
              <Input id="s-subject" name="subject" required minLength={4} maxLength={190} className="mt-1 rounded-none" />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="s-msg">How can we help?</Label>
              <Textarea id="s-msg" name="message" required minLength={10} maxLength={4000} rows={6} className="mt-1 rounded-none" />
            </div>
          </div>
          <Button type="submit" disabled={sending} className="rounded-none">
            {sending ? "Sending…" : "Send request"}
          </Button>
        </form>

        {user && history.length > 0 && (
          <section className="mt-8">
            <h2 className="section-title text-sm">Your previous requests</h2>
            <div className="mt-3 space-y-3">
              {history.map((t) => (
                <article key={String(t["id"])} className="border border-border bg-card p-4 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <strong>
                      {String(t["ticket_number"])} · {String(t["subject"])}
                    </strong>
                    <span className="text-xs uppercase tracking-wide text-muted-foreground">{String(t["status"])}</span>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-muted-foreground">{String(t["message"])}</p>
                  {t["admin_reply"] && (
                    <p className="mt-3 border-l-2 border-border pl-3 whitespace-pre-wrap">{String(t["admin_reply"])}</p>
                  )}
                  <p className="mt-2 text-xs text-muted-foreground">{formatDate(String(t["created_at"]))}</p>
                </article>
              ))}
            </div>
          </section>
        )}
      </div>
    </SiteLayout>
  );
}
