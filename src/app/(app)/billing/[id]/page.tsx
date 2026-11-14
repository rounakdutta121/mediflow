import Link from "next/link";
import { notFound } from "next/navigation";
import { connectDB } from "@/lib/db";
import { Hospital, Invoice, Payment } from "@/models";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { hasPermission, type Role } from "@/lib/permissions";
import { requirePagePermission } from "@/lib/page-auth";
import { CollectPaymentForm } from "./collect-payment-form";
import { DeleteButton } from "@/components/delete-button";
import { PrintButton } from "@/components/billing/print-button";
import { InvoiceDocument } from "@/components/billing/invoice-document";
import { ArrowLeft } from "lucide-react";

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requirePagePermission("billing:read");
  const { id } = await params;
  await connectDB();

  const [invoice, hospital] = await Promise.all([
    Invoice.findOne({
      _id: id,
      hospitalId: session.user.hospitalId,
    })
      .populate(
        "patientId",
        "uhid firstName lastName phone gender address city state pincode"
      )
      .lean(),
    Hospital.findById(session.user.hospitalId).lean(),
  ]);

  if (!invoice || !hospital) notFound();

  const payments = await Payment.find({ invoiceId: id }).sort({ paidAt: -1 }).lean();
  const canWrite = hasPermission(session.user.role as Role, "billing:write");
  const isArchived = Boolean(invoice.isArchived);
  const patient = invoice.patientId as unknown as {
    firstName: string;
    lastName: string;
    uhid: string;
    phone?: string;
    gender?: string;
    address?: string;
    city?: string;
    state?: string;
    pincode?: string;
  };
  const currency = hospital.currency || "INR";

  return (
    <div>
      <div className="no-print mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <Button asChild variant="ghost" size="sm" className="-ml-2">
            <Link href="/billing">
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to billing
            </Link>
          </Button>
          <PageHeader
            title={invoice.invoiceNumber}
            description={`${patient.firstName} ${patient.lastName} · ${patient.uhid} · Print-ready hospital bill${
              isArchived ? " · Archived (Hospital records)" : ""
            }`}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <PrintButton />
          {canWrite && !isArchived && (
            <DeleteButton
              endpoint={`/api/invoices/${id}`}
              label="Remove from billing"
              confirmMessage="Remove this invoice from Billing? It will stay in Hospital records with its payments."
              redirectTo="/billing"
              variant="danger"
            />
          )}
          {isArchived && (
            <Button asChild size="sm" variant="outline">
              <Link href="/records?tab=invoices">View in Hospital records</Link>
            </Button>
          )}
        </div>
      </div>

      {isArchived && (
        <div className="no-print mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-[var(--foreground)]">
          This invoice is archived. It is hidden from the Billing list but kept
          permanently in Hospital records (including payment history).
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.7fr)_minmax(18rem,0.85fr)]">
        <InvoiceDocument
          hospital={{
            name: hospital.name,
            code: hospital.code,
            address: hospital.address,
            phone: hospital.phone,
            email: hospital.email,
            currency,
          }}
          patient={patient}
          invoice={{
            invoiceNumber: invoice.invoiceNumber,
            status: invoice.status,
            issuedAt: invoice.issuedAt,
            createdAt: invoice.createdAt,
            items: invoice.items.map(
              (item: {
                description: string;
                quantity: number;
                unitPrice: number;
                taxPercent: number;
                amount: number;
              }) => ({
                description: item.description,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                taxPercent: item.taxPercent,
                amount: item.amount,
              })
            ),
            subtotal: invoice.subtotal,
            taxTotal: invoice.taxTotal,
            discount: invoice.discount,
            total: invoice.total,
            amountPaid: invoice.amountPaid,
            balance: invoice.balance,
            notes: invoice.notes,
          }}
          payments={payments.map((p) => ({
            _id: String(p._id),
            receiptNumber: p.receiptNumber,
            amount: p.amount,
            method: p.method,
            reference: p.reference,
            paidAt: p.paidAt,
          }))}
        />

        <div className="no-print space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Billing desk</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between gap-3">
                <span className="text-[var(--muted)]">Grand total</span>
                <span className="font-semibold">
                  {formatCurrency(invoice.total, currency)}
                </span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-[var(--muted)]">Paid</span>
                <span>{formatCurrency(invoice.amountPaid, currency)}</span>
              </div>
              <div className="flex justify-between gap-3 border-t border-[var(--border)] pt-3">
                <span className="font-medium">Balance due</span>
                <span className="font-semibold text-[var(--brand-teal)]">
                  {formatCurrency(invoice.balance, currency)}
                </span>
              </div>
              <PrintButton label="Print / save as PDF" />
              <p className="text-xs text-[var(--muted)]">
                Use your browser print dialog to print on A4 or save as PDF for
                patient records.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent receipts</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {payments.map((p) => (
                <div
                  key={String(p._id)}
                  className="rounded-lg border border-[var(--border)] p-3"
                >
                  <div className="flex justify-between font-medium">
                    <span>{p.receiptNumber}</span>
                    <span>{formatCurrency(p.amount, currency)}</span>
                  </div>
                  <p className="text-[var(--muted)]">
                    {p.method.toUpperCase()} · {formatDateTime(p.paidAt)}
                  </p>
                </div>
              ))}
              {payments.length === 0 && (
                <p className="text-[var(--muted)]">No payments yet</p>
              )}
            </CardContent>
          </Card>

          {canWrite &&
            !isArchived &&
            invoice.balance > 0 &&
            invoice.status !== "cancelled" && (
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
