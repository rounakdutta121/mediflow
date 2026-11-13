import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils";
import { amountInWordsINR } from "@/lib/amount-in-words";
import { cn } from "@/lib/utils";

export type InvoiceDocumentHospital = {
  name: string;
  code: string;
  address?: string;
  phone?: string;
  email?: string;
  currency: string;
};

export type InvoiceDocumentPatient = {
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

export type InvoiceDocumentItem = {
  description: string;
  quantity: number;
  unitPrice: number;
  taxPercent: number;
  amount: number;
};

export type InvoiceDocumentPayment = {
  _id: string;
  receiptNumber: string;
  amount: number;
  method: string;
  reference?: string;
  paidAt: string | Date;
};

export type InvoiceDocumentData = {
  invoiceNumber: string;
  status: string;
  issuedAt?: string | Date;
  createdAt: string | Date;
  items: InvoiceDocumentItem[];
  subtotal: number;
  taxTotal: number;
  discount: number;
  total: number;
  amountPaid: number;
  balance: number;
  notes?: string;
};

const STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  issued: "Issued",
  partially_paid: "Partially paid",
  paid: "Paid",
  cancelled: "Cancelled",
};

function methodLabel(method: string) {
  return method.replaceAll("_", " ").toUpperCase();
}

function patientAddress(patient: InvoiceDocumentPatient) {
  return [patient.address, patient.city, patient.state, patient.pincode]
    .filter(Boolean)
    .join(", ");
}

export function InvoiceDocument({
  hospital,
  patient,
  invoice,
  payments,
  className,
}: {
  hospital: InvoiceDocumentHospital;
  patient: InvoiceDocumentPatient;
  invoice: InvoiceDocumentData;
  payments: InvoiceDocumentPayment[];
  className?: string;
}) {
  const currency = hospital.currency || "INR";
  const issued = invoice.issuedAt || invoice.createdAt;
  const statusLabel = STATUS_LABEL[invoice.status] || invoice.status;
  const address = patientAddress(patient);

  return (
    <article
      className={cn("invoice-print-sheet", className)}
      aria-label={`Invoice ${invoice.invoiceNumber}`}
    >
      <header className="invoice-header">
        <div className="invoice-brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/logo.svg"
            alt=""
            width={44}
            height={44}
            className="invoice-logo"
          />
          <div>
            <h1 className="invoice-hospital-name">{hospital.name}</h1>
            <p className="invoice-hospital-meta">
              {[hospital.address, hospital.phone && `Ph: ${hospital.phone}`, hospital.email]
                .filter(Boolean)
                .join(" · ")}
            </p>
            <p className="invoice-hospital-code">Hospital code: {hospital.code}</p>
          </div>
        </div>
        <div className="invoice-title-block">
          <p className="invoice-doc-type">Tax invoice / bill</p>
          <p className="invoice-number">{invoice.invoiceNumber}</p>
          <p className="invoice-status-pill" data-status={invoice.status}>
            {statusLabel}
          </p>
        </div>
      </header>

      <section className="invoice-meta-grid">
        <div>
          <h2 className="invoice-section-label">Bill to</h2>
          <p className="invoice-patient-name">
            {patient.firstName} {patient.lastName}
          </p>
          <dl className="invoice-dl">
            <div>
              <dt>UHID</dt>
              <dd>{patient.uhid}</dd>
            </div>
            {patient.phone && (
              <div>
                <dt>Phone</dt>
                <dd>{patient.phone}</dd>
              </div>
            )}
            {patient.gender && patient.gender !== "unknown" && (
              <div>
                <dt>Gender</dt>
                <dd className="capitalize">{patient.gender}</dd>
              </div>
            )}
            {address && (
              <div className="invoice-dl-span">
                <dt>Address</dt>
                <dd>{address}</dd>
              </div>
            )}
          </dl>
        </div>
        <div>
          <h2 className="invoice-section-label">Invoice details</h2>
          <dl className="invoice-dl">
            <div>
              <dt>Invoice date</dt>
              <dd>{formatDate(issued)}</dd>
            </div>
            <div>
              <dt>Generated</dt>
              <dd>{formatDateTime(invoice.createdAt)}</dd>
            </div>
            <div>
              <dt>Currency</dt>
              <dd>{currency}</dd>
            </div>
            <div>
              <dt>Balance due</dt>
              <dd className="font-semibold">
                {formatCurrency(invoice.balance, currency)}
              </dd>
            </div>
          </dl>
        </div>
      </section>

      <table className="invoice-items">
        <thead>
          <tr>
            <th className="col-no">#</th>
            <th className="col-desc">Particulars / service</th>
            <th className="col-num">Qty</th>
            <th className="col-num">Rate</th>
            <th className="col-num">Tax %</th>
            <th className="col-num">Amount</th>
          </tr>
        </thead>
        <tbody>
          {invoice.items.map((item, idx) => (
            <tr key={`${item.description}-${idx}`}>
              <td className="col-no">{idx + 1}</td>
              <td className="col-desc">{item.description}</td>
              <td className="col-num">{item.quantity}</td>
              <td className="col-num">
                {formatCurrency(item.unitPrice, currency)}
              </td>
              <td className="col-num">{item.taxPercent}</td>
              <td className="col-num">
                {formatCurrency(item.amount, currency)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <section className="invoice-totals-wrap">
        <div className="invoice-words">
          <p className="invoice-section-label">Amount in words</p>
          <p>{amountInWordsINR(invoice.total)}</p>
          {invoice.notes && (
            <>
              <p className="invoice-section-label mt-3">Notes</p>
              <p>{invoice.notes}</p>
            </>
          )}
        </div>
        <dl className="invoice-totals">
          <div>
            <dt>Subtotal</dt>
            <dd>{formatCurrency(invoice.subtotal, currency)}</dd>
          </div>
          <div>
            <dt>Tax</dt>
            <dd>{formatCurrency(invoice.taxTotal, currency)}</dd>
          </div>
          <div>
            <dt>Discount</dt>
            <dd>{formatCurrency(invoice.discount, currency)}</dd>
          </div>
          <div className="invoice-total-row">
            <dt>Grand total</dt>
            <dd>{formatCurrency(invoice.total, currency)}</dd>
          </div>
          <div>
            <dt>Amount paid</dt>
            <dd>{formatCurrency(invoice.amountPaid, currency)}</dd>
          </div>
          <div className="invoice-balance-row">
            <dt>Balance due</dt>
            <dd>{formatCurrency(invoice.balance, currency)}</dd>
          </div>
        </dl>
      </section>

      <section className="invoice-payments">
        <h2 className="invoice-section-label">Payments / receipts</h2>
        {payments.length === 0 ? (
          <p className="invoice-muted">No payments recorded against this invoice.</p>
        ) : (
          <table className="invoice-payments-table">
            <thead>
              <tr>
                <th>Receipt no.</th>
                <th>Method</th>
                <th>Date & time</th>
                <th className="col-num">Amount</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p._id}>
                  <td>
                    {p.receiptNumber}
                    {p.reference ? (
                      <span className="invoice-muted"> · Ref {p.reference}</span>
                    ) : null}
                  </td>
                  <td>{methodLabel(p.method)}</td>
                  <td>{formatDateTime(p.paidAt)}</td>
                  <td className="col-num">
                    {formatCurrency(p.amount, currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <footer className="invoice-footer">
        <div className="invoice-sign">
          <div className="invoice-sign-line" />
          <p>Authorized signatory</p>
        </div>
        <div className="invoice-sign">
          <div className="invoice-sign-line" />
          <p>Patient / attendant</p>
        </div>
        <p className="invoice-disclaimer">
          This is a computer-generated hospital bill from MediFlow. Please retain
          for your records. For discrepancies contact the billing desk.
        </p>
      </footer>
    </article>
  );
}
