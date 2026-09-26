import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { SiteLayout } from "@/components/hs/SiteLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authApi } from "@/lib/auth";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [
      { title: "Reset Your Password | Hydro Sathi" },
      { name: "description", content: "Request a password reset link for your Hydro Sathi buyer or seller account." },
      { property: "og:title", content: "Reset Your Password | Hydro Sathi" },
      { property: "og:description", content: "Email yourself a Hydro Sathi password reset link." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ForgotPasswordPage,
});

const schema = z.object({ email: z.string().trim().email("Enter a valid email") });

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse({ email });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid email");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await authApi.forgotPassword(email, "user");
      setSent(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send the reset email");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SiteLayout crumbs={[{ label: "Forgot password" }]}>
      <div className="mx-auto max-w-md px-4 py-12">
        <div className="border border-border bg-card p-6">
          <h1 className="section-title text-xl">Forgot your password?</h1>
          {sent ? (
            <>
              <p className="mt-3 text-sm text-muted-foreground">
                If an account exists for <strong>{email}</strong>, a reset link is on its way. The link expires in one
                hour.
              </p>
              <Button asChild className="mt-5 rounded-none">
                <Link to="/signin">Back to sign in</Link>
              </Button>
            </>
          ) : (
            <>
              <p className="mt-1 text-sm text-muted-foreground">
                Enter your account email and we will send you a reset link.
              </p>
              <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    className="mt-1 rounded-none"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
                </div>
                <Button type="submit" className="w-full rounded-none" disabled={loading}>
                  {loading ? "Sending…" : "Send reset link"}
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </SiteLayout>
  );
}
