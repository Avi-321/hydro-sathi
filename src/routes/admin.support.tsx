import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { ADMIN_NAV, PortalLayout } from "@/components/hs/PortalLayout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { adminApi } from "@/lib/api";
import { formatDate } from "@/lib/format";

export const Route = createFileRoute("/admin/support")({
  head: () => ({
    meta: [
      { title: "Support Desk | Hydro Sathi Admin" },
      { name: "description", content: "Read and answer help requests from buyers, sellers and guests." },
      { property: "og:title", content: "Support Desk | Hydro Sathi Admin" },
      { property: "og:description", content: "Buyer and seller help requests." },
    ],
  }),
  component: AdminSupport,
});

const STATUSES = ["", "OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"];

function AdminSupport() {
  const qc = useQueryClient();
  const [status, setStatus] = useState("");
  const [replies, setReplies] = useState<Record<number, string>>({});
  const { data: tickets = [] } = useQuery({
    queryKey: ["admin", "support", status],
    queryFn: () => adminApi.listSupportTickets(status || undefined),
  });

  const update = useMutation({
    mutationFn: (v: { id: number; payload: { status?: string; reply?: string } }) =>
      adminApi.updateSupportTicket(v.id, v.payload),
    onSuccess: (res) => {
      toast.success(res.emailSent ? "Reply emailed to the requester" : "Ticket updated (email disabled — check server log)");
      qc.invalidateQueries({ queryKey: ["admin", "support"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Request failed"),
  });

  return (
    <PortalLayout title="Support desk" subtitle="Requests from buyers, sellers and guests" badge="Admin panel" nav={ADMIN_NAV}>
      <div className="mb-4 flex gap-2">
        {STATUSES.map((s) => (
          <Button key={s || "ALL"} size="sm" variant={status === s ? "default" : "outline"} className="rounded-none" onClick={() => setStatus(s)}>
            {s || "All"}
          </Button>
        ))}
      </div>

      <div className="space-y-4">
        {tickets.map((t) => {
          const id = Number(t["id"]);
          return (
            <article key={id} className="border border-border bg-card p-4 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <strong>
                  {String(t["ticket_number"])} · {String(t["subject"])}
                </strong>
                <span className="text-xs uppercase tracking-wide text-muted-foreground">
                  {String(t["role"])} · {String(t["status"])} · {formatDate(String(t["created_at"]))}
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {String(t["name"])} · {String(t["email"])}
                {t["phone"] ? ` · ${String(t["phone"])}` : ""}
                {t["order_number"] ? ` · order ${String(t["order_number"])}` : ""}
              </p>
              <p className="mt-2 whitespace-pre-wrap">{String(t["message"])}</p>
              {t["admin_reply"] && (
                <p className="mt-3 border-l-2 border-border pl-3 whitespace-pre-wrap text-muted-foreground">
                  {String(t["admin_reply"])}
                </p>
              )}
              <Textarea
                className="mt-3 rounded-none"
                rows={3}
                placeholder="Write a reply — it is emailed to the requester"
                value={replies[id] ?? ""}
                onChange={(e) => setReplies((r) => ({ ...r, [id]: e.target.value }))}
              />
              <div className="mt-2 flex flex-wrap gap-2">
                <Button
                  size="sm"
                  className="rounded-none"
                  disabled={update.isPending || (replies[id] ?? "").trim().length < 2}
                  onClick={() => update.mutate({ id, payload: { reply: (replies[id] ?? "").trim() } })}
                >
                  Send reply
                </Button>
                <Button size="sm" variant="outline" className="rounded-none" onClick={() => update.mutate({ id, payload: { status: "RESOLVED" } })}>
                  Mark resolved
                </Button>
                <Button size="sm" variant="outline" className="rounded-none" onClick={() => update.mutate({ id, payload: { status: "CLOSED" } })}>
                  Close
                </Button>
              </div>
            </article>
          );
        })}
        {tickets.length === 0 && <p className="text-sm text-muted-foreground">No support requests.</p>}
      </div>
    </PortalLayout>
  );
}
