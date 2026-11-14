import { connectDB } from "@/lib/db";
import { Invoice } from "@/models";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { hasPermission, type Role } from "@/lib/permissions";
import { requirePagePermission } from "@/lib/page-auth";
import { BillingLiveTable } from "./billing-live-table";

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const session = await requirePagePermission("billing:read");
  const { status } = await searchParams;
  await connectDB();

  const filter: Record<string, unknown> = {
    hospitalId: session.user.hospitalId,
    isArchived: { $ne: true },
  };
  if (status && status !== "all") filter.status = status;

  const invoices = await Invoice.find(filter)
    .populate("patientId", "uhid firstName lastName")
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();

  const canWrite = hasPermission(session.user.role as Role, "billing:write");
  const initialRows = invoices.map((inv) => {
    const patient = inv.patientId as unknown as {
      firstName?: string;
      lastName?: string;
      uhid?: string;
    } | null;
    return {
      _id: String(inv._id),
      invoiceNumber: inv.invoiceNumber,
      createdAt: new Date(inv.createdAt).toISOString(),
      total: inv.total,
      amountPaid: inv.amountPaid,
      balance: inv.balance,
      status: inv.status,
      patientId: patient
        ? {
            firstName: patient.firstName || "",
            lastName: patient.lastName || "",
            uhid: patient.uhid || "",
          }
        : undefined,
    };
  });

  return (
    <div>
      <PageHeader
        title="Billing & Payments"
        description="All invoices including partial payments — filter by status or open Hospital records for full history"
        action={
          canWrite ? { href: "/billing/new", label: "Create invoice" } : undefined
        }
      />

      <Card>
        <CardContent className="p-0">
          <BillingLiveTable
            initialRows={initialRows}
            initialStatus={status || "all"}
          />
        </CardContent>
      </Card>
    </div>
  );
}
