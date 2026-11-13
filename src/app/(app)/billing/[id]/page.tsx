import { notFound } from "next/navigation";
import { connectDB } from "@/lib/db";
import { Invoice, Payment } from "@/models";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TableScroll } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/status-badge";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { hasPermission, type Role } from "@/lib/permissions";
import { requirePagePermission } from "@/lib/page-auth";
import { CollectPaymentForm } from "./collect-payment-form";
import { DeleteButton } from "@/components/delete-button";

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requirePagePermission("billing:read");
  const { id } = await params;
  await connectDB();

  const invoice = await Invoice.findOne({
    _id: id,
    hospitalId: session.user.hospitalId,
  })
    .populate("patientId", "uhid firstName lastName phone")
    .lean();
  if (!invoice) notFound();

  const payments = await Payment.find({ invoiceId: id }).sort({ paidAt: -1 }).lean();
  const canWrite = hasPermission(session.user.role as Role, "billing:write");
  const patient = invoice.patientId as unknown as {
    firstName: string;
    lastName: string;
    uhid: string;
    phone: string;
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <PageHeader
          title={invoice.invoiceNumber}
          description={`${patient.firstName} ${patient.lastName} · ${patient.uhid}`}
        />
        {canWrite && (
          <DeleteButton
            endpoint={`/api/invoices/${id}`}
            label="Delete invoice"
            confirmMessage="Permanently delete this invoice and its payments from the database?"
            redirectTo="/billing"
            variant="danger"
          />
        )}
      </div>

      <div className="mb-4">
        <StatusBadge status={invoice.status} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Line items</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
          <TableScroll className="border-0 shadow-none rounded-none">
              <thead>
                <tr>
                  <th>Description</th>
                  <th>Qty</th>
                  <th>Unit</th>
                  <th>Tax %</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {invoice.items.map((item: (typeof invoice.items)[number], idx: number) => (
                  <tr key={idx}>
                    <td>{item.description}</td>
                    <td>{item.quantity}</td>
                    <td>{formatCurrency(item.unitPrice)}</td>
                    <td>{item.taxPercent}</td>
                    <td>{formatCurrency(item.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </TableScroll>
            <div className="space-y-1 p-5 text-sm">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>{formatCurrency(invoice.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>Tax</span>
                <span>{formatCurrency(invoice.taxTotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>Discount</span>
                <span>{formatCurrency(invoice.discount)}</span>
              </div>
              <div className="flex justify-between text-base font-semibold">
                <span>Total</span>
                <span>{formatCurrency(invoice.total)}</span>
              </div>
              <div className="flex justify-between">
                <span>Paid</span>
                <span>{formatCurrency(invoice.amountPaid)}</span>
              </div>
              <div className="flex justify-between font-semibold text-[var(--brand-teal)]">
                <span>Balance</span>
                <span>{formatCurrency(invoice.balance)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Payments / receipts</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {payments.map((p) => (
                <div
                  key={String(p._id)}
                  className="rounded-lg border border-[var(--border)] p-3"
                >
                  <div className="flex justify-between font-medium">
                    <span>{p.receiptNumber}</span>
                    <span>{formatCurrency(p.amount)}</span>
                  </div>
                  <p className="text-slate-500">
                    {p.method.toUpperCase()} · {formatDateTime(p.paidAt)}
                  </p>
                </div>
              ))}
              {payments.length === 0 && (
                <p className="text-slate-500">No payments yet</p>
              )}
            </CardContent>
          </Card>

          {canWrite && invoice.balance > 0 && invoice.status !== "cancelled" && (
            <CollectPaymentForm
              invoiceId={String(invoice._id)}
              balance={invoice.balance}
            />
          )}
        </div>
      </div>
    </div>
  );
}
