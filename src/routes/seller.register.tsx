import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { SiteLayout } from "@/components/hs/SiteLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { authApi } from "@/lib/auth";
import { uploadApi } from "@/lib/api";

export const Route = createFileRoute("/seller/register")({
  head: () => ({
    meta: [
      { title: "Seller Registration | Hydro Sathi" },
      {
        name: "description",
        content: "Register your business, upload verification documents and start selling hydropower spare parts.",
      },
      { property: "og:title", content: "Seller Registration | Hydro Sathi" },
      { property: "og:description", content: "Seller onboarding with document verification." },
    ],
  }),
  component: SellerRegisterPage,
});

const schema = z.object({
  ownerName: z.string().trim().min(2, "Required").max(100),
  password: z.string().min(8, "Minimum 8 characters").max(128),
  businessName: z.string().trim().min(2, "Required").max(150),
  email: z.string().trim().email("Enter a valid email").max(255),
  phone: z.string().trim().min(7, "Enter a valid phone").max(20),
  address: z.string().trim().min(4, "Required").max(200),
  province: z.string().trim().min(2, "Required").max(60),
  district: z.string().trim().min(2, "Required").max(60),
  city: z.string().trim().min(2, "Required").max(80),
  panNumber: z.string().trim().min(5, "Required").max(30),
  registrationNumber: z.string().trim().min(3, "Required").max(50),
  bankName: z.string().trim().min(2, "Required").max(100),
  accountNumber: z.string().trim().min(5, "Required").max(40),
  description: z.string().trim().min(20, "Describe your business (min 20 chars)").max(1000),
});

const DOCS = [
  { key: "BUSINESS_REGISTRATION", label: "Business registration certificate" },
  { key: "PAN", label: "PAN / VAT certificate" },
  { key: "IDENTITY", label: "Owner identity document" },
  { key: "BANK_DOCUMENT", label: "Bank account proof" },
];

const MAX_FILE_MB = 5;
const ACCEPTED = ".pdf,.jpg,.jpeg,.png";

function SellerRegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState<Record<string, string>>({});
  const [files, setFiles] = useState<Record<string, File>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const onFile = (key: string, file?: File) => {
    if (!file) return;
    if (file.size > MAX_FILE_MB * 1024 * 1024) {
      toast.error(`${file.name} exceeds ${MAX_FILE_MB} MB`);
      return;
    }
    setFiles((f) => ({ ...f, [key]: file }));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      setErrors(Object.fromEntries(parsed.error.issues.map((i) => [i.path[0], i.message])));
      toast.error("Please correct the highlighted fields");
      return;
    }
    setErrors({});
    setSubmitting(true);
    try {
      const d = parsed.data;
      const res = await authApi.register({
        accountType: "SELLER",
        fullName: d.ownerName,
        email: d.email,
        phone: d.phone,
        password: d.password,
        businessName: d.businessName,
        registrationNumber: d.registrationNumber,
        panNumber: d.panNumber,
        province: d.province,
        district: d.district,
        city: d.city,
        addressLine: d.address,
        description: d.description,
        bankName: d.bankName,
        bankAccountNumber: d.accountNumber,
      });
      // Upload the chosen verification files right away using the one-time token.
      const uploadToken = (res as { uploadToken?: string }).uploadToken;
      const chosen = Object.entries(files);
      if (uploadToken && chosen.length) {
        let ok = 0;
        for (const [documentType, file] of chosen) {
          try {
            await uploadApi.sellerDocument(uploadToken, documentType, file);
            ok += 1;
          } catch {
            /* reported below — remaining files can be uploaded from the seller profile */
          }
        }
        toast.success(`${ok} of ${chosen.length} document(s) uploaded`);
      }
      setDone(true);
      toast.success("Application submitted — verify your email to sign in");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setSubmitting(false);
    }
  };

  void navigate;

  const field = (name: string, label: string, type = "text") => (
    <div>
      <Label htmlFor={name}>{label}</Label>
      <Input
        id={name}
        type={type}
        className="mt-1 rounded-none"
        value={form[name] ?? ""}
        onChange={(e) => setForm({ ...form, [name]: e.target.value })}
      />
      {errors[name] && <p className="mt-1 text-xs text-destructive">{errors[name]}</p>}
    </div>
  );

  if (done) {
    return (
      <SiteLayout crumbs={[{ label: "Sell on Hydro Sathi", to: "/sell-on-hydro-sathi" }, { label: "Registration" }]}>
        <div className="mx-auto max-w-xl px-4 py-16 text-center">
          <div className="border border-border bg-card p-8">
            <h1 className="section-title text-xl">Application received</h1>
            <p className="mt-3 text-sm text-muted-foreground">
              We emailed a verification link to <strong>{form["email"]}</strong>. Verify it, sign in, then upload your
              verification documents from your seller profile if any are still missing. Admin approval follows document
              review.
            </p>
            <Button asChild className="mt-6 rounded-none">
              <a href="/signin">Go to sign in</a>
            </Button>
          </div>
        </div>
      </SiteLayout>
    );
  }

  return (
    <SiteLayout crumbs={[{ label: "Sell on Hydro Sathi", to: "/sell-on-hydro-sathi" }, { label: "Registration" }]}>
      <div className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="section-title text-2xl">Seller registration</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your account stays in PENDING status until Hydro Sathi admin verifies your documents.
        </p>

        <form onSubmit={submit} className="mt-6 space-y-6" noValidate>
          <section className="border border-border bg-card p-4">
            <h2 className="section-title text-sm">Business details</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {field("ownerName", "Owner name")}
              {field("businessName", "Business / shop name")}
              {field("email", "Email", "email")}
              {field("password", "Password", "password")}
              {field("phone", "Phone")}
              {field("registrationNumber", "Business registration number")}
              {field("panNumber", "PAN / VAT number")}
              {field("province", "Province")}
              {field("district", "District")}
              {field("city", "City / municipality")}
              <div className="sm:col-span-2">{field("address", "Address")}</div>
              <div className="sm:col-span-2">
                <Label htmlFor="description">Business description</Label>
                <Textarea
                  id="description"
                  maxLength={1000}
                  className="mt-1 rounded-none"
                  value={form["description"] ?? ""}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
                {errors["description"] && (
                  <p className="mt-1 text-xs text-destructive">{errors["description"]}</p>
                )}
              </div>
            </div>
          </section>

          <section className="border border-border bg-card p-4">
            <h2 className="section-title text-sm">Settlement account</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {field("bankName", "Bank name")}
              {field("accountNumber", "Account number")}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Account numbers are stored encrypted and never exposed through buyer APIs.
            </p>
          </section>

          <section className="border border-border bg-card p-4">
            <h2 className="section-title text-sm">Documents</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              PDF, JPG or PNG · max {MAX_FILE_MB} MB per file. Files are uploaded from your seller profile once your
              email is verified.
            </p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {DOCS.map((d) => (
                <div key={d.key}>
                  <Label htmlFor={d.key}>{d.label}</Label>
                  <Input
                    id={d.key}
                    type="file"
                    accept={ACCEPTED}
                    className="mt-1 rounded-none"
                    onChange={(e) => onFile(d.key, e.target.files?.[0])}
                  />
                  {files[d.key] && <p className="mt-1 text-xs text-success">{files[d.key]?.name} selected</p>}
                </div>
              ))}
            </div>
          </section>

          <Button type="submit" className="rounded-none" disabled={submitting}>
            {submitting ? "Submitting…" : "Submit application"}
          </Button>
        </form>
      </div>
    </SiteLayout>
  );
}
