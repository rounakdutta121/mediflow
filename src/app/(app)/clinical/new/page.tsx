import { Suspense } from "react";
import { requirePagePermission } from "@/lib/page-auth";
import { NewEncounterForm } from "./new-encounter-form";

export default async function NewEncounterPage() {
  await requirePagePermission("clinical:write");
  return (
    <Suspense fallback={<div className="p-6 text-sm text-slate-500">Loading…</div>}>
      <NewEncounterForm />
    </Suspense>
  );
}
