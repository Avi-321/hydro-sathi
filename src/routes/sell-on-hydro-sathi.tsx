import { createFileRoute, Link } from "@tanstack/react-router";
import { ClipboardCheck, FileUp, PackagePlus, Wallet } from "lucide-react";
import { SiteLayout } from "@/components/hs/SiteLayout";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/sell-on-hydro-sathi")({
  head: () => ({
    meta: [
      { title: "Sell Hydropower Spare Parts | Hydro Sathi" },
      {
        name: "description",
        content:
          "Register your Nepali business on Hydro Sathi, get verified by admin and sell hydropower spare parts with transparent commission.",
      },
      { property: "og:title", content: "Sell Hydropower Spare Parts | Hydro Sathi" },
      { property: "og:description", content: "Seller onboarding, verification and settlement on Hydro Sathi." },
    ],
  }),
  component: SellPage,
});

const STEPS = [
  { icon: FileUp, title: "Register & upload documents", text: "Business registration, PAN/VAT, identity and bank documents." },
  { icon: ClipboardCheck, title: "Admin verification", text: "Hydro Sathi reviews your documents and approves your account." },
  { icon: PackagePlus, title: "List your parts", text: "Add part numbers, OEM references, specifications, images and stock." },
  { icon: Wallet, title: "Get settled", text: "Commission is deducted per order; net settlement is reported per order." },
];

function SellPage() {
  return (
    <SiteLayout crumbs={[{ label: "Sell on Hydro Sathi" }]}>
      <section className="bg-steel py-14 text-steel-foreground">
        <div className="mx-auto max-w-[1400px] px-4">
          <h1 className="max-w-3xl font-display text-4xl font-bold uppercase">
            Sell hydropower spare parts to plants across Nepal
          </h1>
          <p className="mt-3 max-w-2xl text-steel-foreground/80">
            Reach procurement teams searching by part number and OEM number. Transparent commission, order-level
            settlement, admin-verified buyers.
          </p>
          <Button asChild size="lg" className="mt-6 rounded-none">
            <Link to="/seller/register">Start seller registration</Link>
          </Button>
        </div>
      </section>

      <section className="mx-auto max-w-[1400px] px-4 py-12">
        <h2 className="section-title text-2xl">How selling works</h2>
        <ol className="mt-4 grid gap-4 md:grid-cols-4">
          {STEPS.map((s, i) => (
            <li key={s.title} className="border border-border bg-card p-5">
              <span className="part-no text-primary">STEP 0{i + 1}</span>
              <s.icon className="mt-3 h-6 w-6" />
              <h3 className="mt-3 text-sm font-semibold">{s.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{s.text}</p>
            </li>
          ))}
        </ol>
      </section>
    </SiteLayout>
  );
}
