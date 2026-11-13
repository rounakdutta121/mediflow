import Link from "next/link";
import { connectDB } from "@/lib/db";
import { Invoice } from "@/models";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { TableScroll } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import { hasPermission, type Role } from "@/lib/permissions";
import { requirePagePermission } from "@/lib/page-auth";

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

  return (
    <div>
      <PageHeader
        title="Billing & Payments"
        description="Service catalogue invoices, receipts and outstanding balances"
        action={
          canWrite ? { href: "/billing/new", label: "Create invoice" } : undefined
        }
      />

      <Card>
        <CardContent className="p-0">
          <TableScroll className="border-0 shadow-none rounded-none">
            <thead>
              <tr>
                <th>Invoice</th>
                <th>Patient</th>
                <th>Date</th>
                <th>Total</th>
                <th>Balance</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => {
                const patient = inv.patientId as unknown as {
                  firstName: string;
                  lastName: string;
                  uhid: string;
                };
                return (
                  <tr key={String(inv._id)}>
                    <td className="font-medium">{inv.invoiceNumber}</td>
                    <td>
                      {patient?.firstName} {patient?.lastName}
                      <div className="text-xs text-slate-500">{patient?.uhid}</div>
                    </td>
                    <td>{formatDate(inv.createdAt)}</td>
                    <td>{formatCurrency(inv.total)}</td>
                    <td>{formatCurrency(inv.balance)}</td>
                    <td>
                      <StatusBadge status={inv.status} />
                    </td>
                    <td>
                      <Button asChild size="sm" variant="ghost">
                        <Link href={`/billing/${inv._id}`}>Open</Link>
                      </Button>
                    </td>
                  </tr>
                );
              })}
              {invoices.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-500">
                    No invoices yet
                  </td>
                </tr>
              )}
            </tbody>
          </TableScroll>
        </CardContent>
      </Card>
    </div>
  );
}
