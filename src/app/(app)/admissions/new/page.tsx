import { Suspense } from "react";
import { requirePagePermission } from "@/lib/page-auth";
import { NewAdmissionForm } from "./new-admission-form";

export default async function NewAdmissionPage() {
  await requirePagePermission("admission:write");

  return (
    <Suspense fallback={<div className="text-sm text-[var(--muted)]">Loading…</div>}>
      <NewAdmissionForm />
    </Suspense>
  );
}
