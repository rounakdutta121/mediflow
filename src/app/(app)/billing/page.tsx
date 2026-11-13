import { connectDB } from "@/lib/db";
import { Invoice } from "@/models";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { hasPermission, type Role } from "@/lib/permissions";
import { requirePagePermission } from "@/lib/page-auth";
import { BillingLiveTable } from "./billing-live-table";

export default async function BillingPage() {
  const session = await requirePagePermission("billing:read");
  await connectDB();

  const invoices = await Invoice.find({
    hospitalId: session.user.hospitalId,
  })
    .populate("patientId", "uhid firstName lastName")
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();

  const canWrite = hasPermission(session.user.role as Role, "billing:write");
  const initialRows = invoices.map((inv) => {
    const patient = inv.patientId as unknown as {
      firstName?: string;
      lastName?: string;
      uhid?: string;
    };
    return {
      _id: String(inv._id),
      invoiceNumber: inv.invoiceNumber,
      createdAt: String(inv.createdAt),
      total: inv.total,
      balance: inv.balance,
      status: inv.status,
      patientId: patient,
    };
  });

  return (
    <div>
      <PageHeader
        title="Billing & Payments"
        description="Hospital invoices, receipts and balances — open any bill to print or save as PDF"
        action={
          canWrite ? { href: "/billing/new", label: "Create invoice" } : undefined
        }
      />

      <Card>
        <CardContent className="p-0">
          <BillingLiveTable initialRows={initialRows} />
        </CardContent>
      </Card>
    </div>
  );
}
