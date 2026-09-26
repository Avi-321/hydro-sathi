import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { PortalLayout, SELLER_NAV } from "@/components/hs/PortalLayout";
import { StatusBadge } from "@/components/hs/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { sellerApi } from "@/lib/api";
import { formatDate } from "@/lib/format";

export const Route = createFileRoute("/seller/profile")({
  head: () => ({
    meta: [
      { title: "Seller Profile | Hydro Sathi" },
      { name: "description", content: "Business profile, verification status and commission rate for your seller account." },
      { property: "og:title", content: "Seller Profile | Hydro Sathi" },
      { property: "og:description", content: "Seller business and verification details." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SellerProfile,
});

const DOC_TYPES = [
  { key: "BUSINESS_REGISTRATION", label: "Business registration certificate" },
  { key: "PAN", label: "PAN / VAT certificate" },
  { key: "IDENTITY", label: "Owner identity document" },
  { key: "BANK_DOCUMENT", label: "Bank account proof" },
];

const MAX_FILE_MB = 5;

function SellerProfile() {
  const { user } = useAuth();
  const sellerId = user?.sellerId ?? 0;
  const qc = useQueryClient();
  const [uploading, setUploading] = useState<string | null>(null);

  const { data } = useQuery({
    queryKey: ["seller", "profile", sellerId],
    queryFn: () => sellerApi.getProfileWithDocuments(),
  });

  const seller = data?.seller;
  const documents = data?.documents ?? [];

  const upload = async (documentType: string, file?: File) => {
    if (!file) return;
    if (file.size > MAX_FILE_MB * 1024 * 1024) {
      toast.error(`${file.name} exceeds ${MAX_FILE_MB} MB`);
      return;
    }
    setUploading(documentType);
    try {
      await sellerApi.uploadDocument(documentType, "", file);
      toast.success("Document uploaded — awaiting admin review");
      await qc.invalidateQueries({ queryKey: ["seller", "profile"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(null);
    }
  };

  if (!seller) {
    return (
      <PortalLayout title="Profile" badge="Seller portal" nav={SELLER_NAV}>
        <p className="text-sm text-muted-foreground">Loading your seller profile…</p>
      </PortalLayout>
    );
  }

  const rows: [string, string][] = [
    ["Business name", seller.businessName],
    ["Business type", seller.businessType],
    ["Registration number", seller.registrationNumber],
    ["PAN number", seller.panNumber],
    ["VAT number", seller.vatNumber ?? "—"],
    ["Address", `${seller.address}, ${seller.city}`],
    ["District", seller.district],
    ["Province", seller.province],
    ["Commission rate", `${seller.commissionRate}%`],
    ["Member since", formatDate(seller.createdAt)],
  ];

  return (
    <PortalLayout title="Profile" subtitle={seller.businessName} badge="Seller portal" nav={SELLER_NAV}>
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <section className="border border-border bg-card p-4">
          <h2 className="section-title text-sm">Business details</h2>
          <dl className="mt-3">
            {rows.map(([k, v]) => (
              <div key={k} className="flex justify-between border-b border-border py-2 text-sm">
                <dt className="text-muted-foreground">{k}</dt>
                <dd className="font-medium">{v}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-3 text-xs text-muted-foreground">
            Commission rate is set by Hydro Sathi admin and cannot be edited by sellers.
          </p>
        </section>

        <aside className="h-fit space-y-4">
          <div className="border border-border bg-card p-4">
            <h2 className="section-title text-sm">Verification</h2>
            <div className="mt-3 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Account status</span>
              <StatusBadge status={seller.approvalStatus} />
            </div>
          </div>

          <div className="border border-border bg-card p-4">
            <h2 className="section-title text-sm">Verification documents</h2>
            <p className="mt-1 text-xs text-muted-foreground">PDF, JPG or PNG · max {MAX_FILE_MB} MB per file</p>
            <div className="mt-3 space-y-4">
              {DOC_TYPES.map((d) => {
                const uploaded = documents.find((doc) => doc.documentType === d.key);
                return (
                  <div key={d.key}>
                    <div className="flex items-center justify-between gap-2">
                      <Label htmlFor={d.key} className="text-xs">
                        {d.label}
                      </Label>
                      {uploaded && <StatusBadge status={uploaded.status} />}
                    </div>
                    <Input
                      id={d.key}
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      disabled={uploading === d.key}
                      className="mt-1 rounded-none"
                      onChange={(e) => upload(d.key, e.target.files?.[0])}
                    />
                    {uploaded && (
                      <a
                        href={uploaded.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-1 block truncate text-xs text-primary hover:underline"
                      >
                        {uploaded.fileName}
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
            <Button variant="outline" size="sm" className="mt-4 w-full rounded-none" onClick={() => qc.invalidateQueries({ queryKey: ["seller", "profile"] })}>
              Refresh status
            </Button>
          </div>
        </aside>
      </div>
    </PortalLayout>
  );
}
