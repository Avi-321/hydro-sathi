import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { SiteLayout } from "@/components/hs/SiteLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authApi } from "@/lib/auth";
import { syncLocalCart } from "@/lib/store";

export const Route = createFileRoute("/signin")({
  head: () => ({
    meta: [
      { title: "Sign In | Hydro Sathi" },
      { name: "description", content: "Sign in to your Hydro Sathi buyer or seller account." },
      { property: "og:title", content: "Sign In | Hydro Sathi" },
      { property: "og:description", content: "Access your Hydro Sathi account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SignInPage,
});

const schema = z.object({
  email: z.string().trim().email("Enter a valid email").max(255),
  password: z.string().min(8, "Password must be at least 8 characters").max(128),
});

function SignInPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [unverified, setUnverified] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      setErrors(Object.fromEntries(parsed.error.issues.map((i) => [i.path[0], i.message])));
      return;
    }
    setErrors({});
    setLoading(true);
    setUnverified(false);
    try {
      const user = await authApi.login(parsed.data.email, parsed.data.password);
      await syncLocalCart();
      toast.success(`Welcome back, ${user.fullName}`);
      navigate({ to: user.role === "SELLER" ? "/seller/dashboard" : "/" });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Sign in failed";
      if (message.toLowerCase().includes("verify")) setUnverified(true);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SiteLayout crumbs={[{ label: "Sign in" }]}>
      <div className="mx-auto max-w-md px-4 py-12">
        <div className="border border-border bg-card p-6">
          <h1 className="section-title text-xl">Sign in</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Buyers and sellers use the same form — your account type is detected automatically.
          </p>
          <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                className="mt-1 rounded-none"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
              {errors["email"] && <p className="mt-1 text-xs text-destructive">{errors["email"]}</p>}
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                className="mt-1 rounded-none"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
              {errors["password"] && <p className="mt-1 text-xs text-destructive">{errors["password"]}</p>}
            </div>
            <Button type="submit" className="w-full rounded-none" disabled={loading}>
              {loading ? "Signing in…" : "Sign in"}
            </Button>
          </form>

          {unverified && (
            <div className="mt-4 border border-accent bg-accent/10 p-3 text-sm">
              <p>Your email is not verified yet.</p>
              <Button
                variant="link"
                className="h-auto p-0 text-sm"
                onClick={async () => {
                  await authApi.resendVerification(form.email);
                  toast.success("Verification email sent again");
                }}
              >
                Resend the verification email
              </Button>
            </div>
          )}

          <div className="mt-4 flex flex-wrap justify-between gap-2 text-sm text-muted-foreground">
            <Link to="/forgot-password" className="font-medium text-primary hover:underline">
              Forgot password?
            </Link>
            <Link to="/signup" className="font-medium text-primary hover:underline">
              Create an account
            </Link>
          </div>
          <p className="mt-4 border-t border-border pt-3 text-xs text-muted-foreground">
            Administrators sign in from the{" "}
            <Link to="/admin/login" className="text-primary hover:underline">
              admin portal
            </Link>
            .
          </p>
        </div>
      </div>
    </SiteLayout>
  );
}
