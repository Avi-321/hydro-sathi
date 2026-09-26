import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { SiteLayout } from "@/components/hs/SiteLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authApi } from "@/lib/auth";

export const Route = createFileRoute("/reset-password")({
  validateSearch: (search: Record<string, unknown>) => ({
    token: typeof search["token"] === "string" ? search["token"] : undefined,
    portal: search["portal"] === "admin" ? ("admin" as const) : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Set a New Password | Hydro Sathi" },
      { name: "description", content: "Choose a new password for your Hydro Sathi account using your emailed reset link." },
      { property: "og:title", content: "Set a New Password | Hydro Sathi" },
      { property: "og:description", content: "Complete your Hydro Sathi password reset." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ResetPasswordPage,
});

const schema = z
  .object({
    password: z.string().min(8, "Minimum 8 characters").max(128),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, { path: ["confirm"], message: "Passwords do not match" });

function ResetPasswordPage() {
  const { token, portal } = Route.useSearch();
  const navigate = useNavigate();
  const [form, setForm] = useState({ password: "", confirm: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      toast.error("This reset link is missing its token");
      return;
    }
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      setErrors(Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0]), i.message])));
      return;
    }
    setErrors({});
    setLoading(true);
    try {
      await authApi.resetPassword(token, parsed.data.password);
      toast.success("Password updated — please sign in");
      navigate({ to: portal === "admin" ? "/admin/login" : "/signin" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "This reset link is invalid or has expired");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SiteLayout crumbs={[{ label: "Reset password" }]}>
      <div className="mx-auto max-w-md px-4 py-12">
        <div className="border border-border bg-card p-6">
          <h1 className="section-title text-xl">Set a new password</h1>
          {!token ? (
            <>
              <p className="mt-2 text-sm text-muted-foreground">
                This link is incomplete. Request a new reset email.
              </p>
              <Button asChild className="mt-5 rounded-none">
                <Link to="/forgot-password">Request new link</Link>
              </Button>
            </>
          ) : (
            <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
              <div>
                <Label htmlFor="password">New password</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  className="mt-1 rounded-none"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                />
                {errors["password"] && <p className="mt-1 text-xs text-destructive">{errors["password"]}</p>}
              </div>
              <div>
                <Label htmlFor="confirm">Confirm password</Label>
                <Input
                  id="confirm"
                  type="password"
                  autoComplete="new-password"
                  className="mt-1 rounded-none"
                  value={form.confirm}
                  onChange={(e) => setForm({ ...form, confirm: e.target.value })}
                />
                {errors["confirm"] && <p className="mt-1 text-xs text-destructive">{errors["confirm"]}</p>}
              </div>
              <Button type="submit" className="w-full rounded-none" disabled={loading}>
                {loading ? "Updating…" : "Update password"}
              </Button>
            </form>
          )}
        </div>
      </div>
    </SiteLayout>
  );
}
