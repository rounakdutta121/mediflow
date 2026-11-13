import { Suspense } from "react";
import { requirePagePermission } from "@/lib/page-auth";
import { NewInvoiceForm } from "./new-invoice-form";

export default async function NewInvoicePage() {
  await requirePagePermission("billing:write");
  return (
    <Suspense fallback={<div className="p-6 text-sm text-slate-500">Loading…</div>}>
      <NewInvoiceForm />
    </Suspense>
  );
}
