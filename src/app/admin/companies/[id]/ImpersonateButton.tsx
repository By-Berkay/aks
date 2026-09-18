"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui";

export function ImpersonateButton({ companyId }: { companyId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function open() {
    setBusy(true);
    const res = await fetch(`/api/admin/companies/${companyId}/impersonate`, { method: "POST" });
    const json = await res.json();
    setBusy(false);
    if (json.success) {
      router.push(json.data.redirect);
      router.refresh();
    }
  }

  return (
    <Button onClick={open} disabled={busy} variant="secondary">
      {busy ? "..." : "Firma panelini goruntule"}
    </Button>
  );
}
