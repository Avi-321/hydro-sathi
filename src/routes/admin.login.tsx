import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { ShieldCheck } from "lucide-react";
import { Logo } from "@/components/hs/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authApi } from "@/lib/auth";

export const Route = createFileRoute("/admin/login")({
  head: () => ({
    meta: [
      { title: "Admin Portal Login | Hydro Sathi" },
      { name: "description", content: "Restricted administrator sign-in for the Hydro Sathi marketplace control panel." },
      { property: "og:title", content: "Admin Portal Login | Hydro Sathi" },
      { property: "og:description", content: "Restricted administrator access." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminLoginPage,
});

const schema = z.object({
  email: z.string().trim().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

function AdminLoginPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [resetting, setResetting] = useState(false);

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
      await authApi.adminLogin(parsed.data.email, parsed.data.password);
      toast.success("Administrator signed in");
      navigate({ to: "/admin/dashboard" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sign in failed");
    } finally {
      setLoading(false);
    }
  };

  const sendReset = async () => {
    if (!form.email) {
      toast.error("Enter the admin email first");
      return;
    }
    setResetting(true);
    await authApi.forgotPassword(form.email, "admin");
    setResetting(false);
    toast.success("If that admin account exists, a reset link has been emailed");
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-sidebar px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center gap-3 text-sidebar-foreground">
          <Logo />
          <span className="flex items-center gap-2 bg-sidebar-primary px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-sidebar-primary-foreground">
            <ShieldCheck className="h-3.5 w-3.5" /> Admin portal
          </span>
        </div>
        <div className="border border-border bg-card p-6">
          <h1 className="section-title text-xl">Administrator sign in</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Restricted access. Buyer and seller accounts cannot sign in here.
          </p>
          <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
            <div>
              <Label htmlFor="email">Admin email</Label>
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
              {loading ? "Signing in…" : "Sign in to admin panel"}
            </Button>
          </form>
          <div className="mt-4 flex justify-between text-sm">
            <button type="button" onClick={sendReset} className="text-primary hover:underline" disabled={resetting}>
              {resetting ? "Sending…" : "Forgot admin password?"}
            </button>
            <Link to="/" className="text-muted-foreground hover:underline">
              Back to storefront
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
