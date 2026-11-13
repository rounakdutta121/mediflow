import { Suspense } from "react";
import { requirePagePermission } from "@/lib/page-auth";
import { NewAppointmentForm } from "./new-appointment-form";

export default async function NewAppointmentPage() {
  await requirePagePermission("appointments:write");
  return (
    <Suspense fallback={<div className="p-6 text-sm text-slate-500">Loading…</div>}>
      <NewAppointmentForm />
    </Suspense>
  );
}
