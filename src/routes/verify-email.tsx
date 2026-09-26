import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { SiteLayout } from "@/components/hs/SiteLayout";
import { Button } from "@/components/ui/button";
import { authApi } from "@/lib/auth";

export const Route = createFileRoute("/verify-email")({
  validateSearch: (search: Record<string, unknown>) => ({
    token: typeof search["token"] === "string" ? search["token"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Verify Email | Hydro Sathi" },
      { name: "description", content: "Confirm your Hydro Sathi email address to activate your buyer or seller account." },
      { property: "og:title", content: "Verify Email | Hydro Sathi" },
      { property: "og:description", content: "Activate your Hydro Sathi account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: VerifyEmailPage,
});

function VerifyEmailPage() {
  const { token } = Route.useSearch();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"working" | "done" | "error">("working");
  const [message, setMessage] = useState("");
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    if (!token) {
      setStatus("error");
      setMessage("This link is missing its verification token.");
      return;
    }
    authApi
      .verifyEmail(token)
      .then((user) => {
        setStatus("done");
        setMessage(`Your email is verified, ${user.fullName}.`);
        setTimeout(() => navigate({ to: user.role === "SELLER" ? "/seller/dashboard" : "/" }), 1800);
      })
      .catch((err: unknown) => {
        setStatus("error");
        setMessage(err instanceof Error ? err.message : "This verification link is invalid or has expired.");
      });
  }, [token, navigate]);

  return (
    <SiteLayout crumbs={[{ label: "Verify email" }]}>
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <div className="border border-border bg-card p-8">
          {status === "working" && <Loader2 className="mx-auto h-10 w-10 animate-spin text-primary" />}
          {status === "done" && <CheckCircle2 className="mx-auto h-10 w-10 text-success" />}
          {status === "error" && <XCircle className="mx-auto h-10 w-10 text-destructive" />}
          <h1 className="section-title mt-4 text-xl">
            {status === "working" ? "Verifying your email…" : status === "done" ? "Email verified" : "Verification failed"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">{message}</p>
          {status === "error" && (
            <Button asChild className="mt-5 rounded-none">
              <Link to="/signin">Back to sign in</Link>
            </Button>
          )}
        </div>
      </div>
    </SiteLayout>
  );
}
