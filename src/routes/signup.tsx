import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { MailCheck } from "lucide-react";
import { SiteLayout } from "@/components/hs/SiteLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authApi } from "@/lib/auth";

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { title: "Create Account | Hydro Sathi" },
      { name: "description", content: "Create a Hydro Sathi buyer account to order hydropower spare parts in Nepal." },
      { property: "og:title", content: "Create Account | Hydro Sathi" },
      { property: "og:description", content: "Register as a buyer on Hydro Sathi." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SignUpPage,
});

const schema = z.object({
  fullName: z.string().trim().min(2, "Required").max(120),
  email: z.string().trim().email("Enter a valid email").max(255),
  phone: z.string().trim().min(7, "Enter a valid phone number").max(20),
  password: z.string().min(8, "Minimum 8 characters").max(128),
});

function SignUpPage() {
  const [form, setForm] = useState({ fullName: "", email: "", phone: "", password: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      setErrors(Object.fromEntries(parsed.error.issues.map((i) => [i.path[0], i.message])));
      return;
    }
    setErrors({});
    setLoading(true);
    try {
      await authApi.register({ ...parsed.data, accountType: "BUYER" });
      setSent(true);
      toast.success("Account created — check your email to verify it");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const field = (name: keyof typeof form, label: string, type = "text") => (
    <div>
      <Label htmlFor={name}>{label}</Label>
      <Input
        id={name}
        type={type}
        className="mt-1 rounded-none"
        value={form[name]}
        onChange={(e) => setForm({ ...form, [name]: e.target.value })}
      />
      {errors[name] && <p className="mt-1 text-xs text-destructive">{errors[name]}</p>}
    </div>
  );

  return (
    <SiteLayout crumbs={[{ label: "Create account" }]}>
      <div className="mx-auto max-w-lg px-4 py-12">
        {sent ? (
          <div className="border border-border bg-card p-6 text-center">
            <MailCheck className="mx-auto h-10 w-10 text-primary" />
            <h1 className="section-title mt-3 text-xl">Verify your email</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              We sent a verification link to <strong>{form.email}</strong>. Click it to activate your account, then sign
              in.
            </p>
            <div className="mt-5 flex justify-center gap-2">
              <Button asChild className="rounded-none">
                <Link to="/signin">Go to sign in</Link>
              </Button>
              <Button
                variant="outline"
                className="rounded-none"
                onClick={async () => {
                  await authApi.resendVerification(form.email);
                  toast.success("Verification email sent again");
                }}
              >
                Resend email
              </Button>
            </div>
          </div>
        ) : (
          <div className="border border-border bg-card p-6">
            <h1 className="section-title text-xl">Create your buyer account</h1>
            <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
              {field("fullName", "Full name")}
              {field("email", "Work email", "email")}
              {field("phone", "Phone")}
              {field("password", "Password", "password")}
              <Button type="submit" className="w-full rounded-none" disabled={loading}>
                {loading ? "Creating account…" : "Create account"}
              </Button>
            </form>
            <p className="mt-4 text-sm text-muted-foreground">
              Selling parts?{" "}
              <Link to="/seller/register" className="font-medium text-primary hover:underline">
                Register as a seller
              </Link>
            </p>
          </div>
        )}
      </div>
    </SiteLayout>
  );
}
