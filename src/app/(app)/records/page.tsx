import Link from "next/link";
import { connectDB } from "@/lib/db";
import {
  Admission,
  Appointment,
  Invoice,
  Patient,
  Payment,
} from "@/models";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TableScroll } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils";
import { hasPermission, type Role } from "@/lib/permissions";
import { requirePagePermission } from "@/lib/page-auth";

export default async function RecordsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const session = await requirePagePermission("records:read");
  const { tab: rawTab } = await searchParams;
  await connectDB();

  const role = session.user.role as Role;
  const hospitalId = session.user.hospitalId;

  const canPatients = hasPermission(role, "patients:read");
  const canAppointments = hasPermission(role, "appointments:read");
  const canBilling = hasPermission(role, "billing:read");
  const canAdmission = hasPermission(role, "admission:read");

  const tabs = [
    canPatients && { id: "patients", label: "Patients" },
    canAppointments && { id: "appointments", label: "Appointments" },
    canBilling && { id: "invoices", label: "Invoices" },
    canBilling && { id: "payments", label: "Payments" },
    canAdmission && { id: "admissions", label: "Admissions" },
  ].filter(Boolean) as { id: string; label: string }[];

  const tab =
    tabs.find((t) => t.id === rawTab)?.id || tabs[0]?.id || "patients";

  const [
    patients,
    appointments,
    invoices,
    payments,
    admissions,
  ] = await Promise.all([
    canPatients
      ? Patient.find({ hospitalId })
          .sort({ updatedAt: -1 })
          .limit(100)
          .lean()
      : Promise.resolve([]),
    canAppointments
      ? Appointment.find({ hospitalId })
          .populate("patientId", "uhid firstName lastName")
          .populate("doctorId", "name")
          .sort({ scheduledAt: -1 })
          .limit(100)
          .lean()
      : Promise.resolve([]),
    canBilling
      ? Invoice.find({ hospitalId })
          .populate("patientId", "uhid firstName lastName")
          .sort({ createdAt: -1 })
          .limit(100)
          .lean()
      : Promise.resolve([]),
    canBilling
      ? Payment.find({ hospitalId })
          .populate("patientId", "uhid firstName lastName")
          .populate("invoiceId", "invoiceNumber")
          .sort({ paidAt: -1 })
          .limit(100)
          .lean()
      : Promise.resolve([]),
    canAdmission
      ? Admission.find({ hospitalId })
          .populate("patientId", "uhid firstName lastName")
          .populate("wardId", "name code")
          .populate("bedId", "bedNumber")
          .sort({ admittedAt: -1 })
          .limit(100)
          .lean()
      : Promise.resolve([]),
  ]);

  return (
    <div>
      <PageHeader
        title="Hospital records"
        description="Permanent hospital history — archived patients, appointments, invoices, and payments stay here even after removal from operational screens"
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {tabs.map((t) => (
          <Button
            key={t.id}
            asChild
            size="sm"
            variant={tab === t.id ? "default" : "outline"}
          >
            <Link href={`/records?tab=${t.id}`}>{t.label}</Link>
          </Button>
        ))}
      </div>

      {tab === "patients" && canPatients && (
        <Card>
          <CardHeader>
            <CardTitle>Patient registry (active + archived)</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <TableScroll className="border-0 shadow-none rounded-none">
              <thead>
                <tr>
                  <th>UHID</th>
                  <th>Name</th>
                  <th>Phone</th>
                  <th>Registered</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {patients.map((p) => (
                  <tr key={String(p._id)}>
                    <td className="font-medium">{p.uhid}</td>
                    <td>
                      {p.firstName} {p.lastName}
                    </td>
                    <td>{p.phone}</td>
                    <td>{formatDate(p.createdAt)}</td>
                    <td>
                      <StatusBadge
                        status={p.isActive ? "available" : "cancelled"}
                      />
                      <span className="ml-2 text-xs text-[var(--muted)]">
                        {p.isActive ? "active" : "archived"}
                      </span>
                    </td>
                    <td>
                      <Button asChild size="sm" variant="ghost">
                        <Link href={`/patients/${String(p._id)}`}>Open</Link>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </TableScroll>
          </CardContent>
        </Card>
      )}

      {tab === "appointments" && canAppointments && (
        <Card>
          <CardHeader>
            <CardTitle>
              Appointment history (including archived — never permanently deleted)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <TableScroll className="border-0 shadow-none rounded-none">
              <thead>
                <tr>
                  <th>When</th>
                  <th>Patient</th>
                  <th>Doctor</th>
                  <th>Status</th>
                  <th>Token</th>
                </tr>
              </thead>
              <tbody>
                {appointments.map((a) => {
                  const patient = a.patientId as unknown as {
                    uhid?: string;
                    firstName?: string;
                    lastName?: string;
                  } | null;
                  const doctor = a.doctorId as unknown as { name?: string } | null;
                  return (
                    <tr key={String(a._id)}>
                      <td>{formatDateTime(a.scheduledAt)}</td>
                      <td>
                        {patient?.firstName} {patient?.lastName}
                        <div className="text-xs text-[var(--muted)]">
                          {patient?.uhid}
                        </div>
                      </td>
                      <td>{doctor?.name || "—"}</td>
                      <td>
                        <StatusBadge status={a.status} />
                        {a.isArchived && (
                          <span className="ml-2 text-xs text-[var(--muted)]">
                            archived
                          </span>
                        )}
                      </td>
                      <td>{a.tokenNumber ?? "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </TableScroll>
          </CardContent>
        </Card>
      )}

      {tab === "invoices" && canBilling && (
        <Card>
          <CardHeader>
            <CardTitle>
              Invoice history (including archived — never permanently deleted)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <TableScroll className="border-0 shadow-none rounded-none">
              <thead>
                <tr>
                  <th>Invoice</th>
                  <th>Patient</th>
                  <th>Date</th>
                  <th>Total</th>
                  <th>Paid</th>
                  <th>Balance</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => {
                  const patient = inv.patientId as unknown as {
                    uhid?: string;
                    firstName?: string;
                    lastName?: string;
                  } | null;
                  return (
                    <tr key={String(inv._id)}>
                      <td className="font-medium">{inv.invoiceNumber}</td>
                      <td>
                        {patient?.firstName} {patient?.lastName}
                        <div className="text-xs text-[var(--muted)]">
                          {patient?.uhid}
                        </div>
                      </td>
                      <td>{formatDate(inv.createdAt)}</td>
                      <td>{formatCurrency(inv.total)}</td>
                      <td>{formatCurrency(inv.amountPaid)}</td>
                      <td>{formatCurrency(inv.balance)}</td>
                      <td>
                        <StatusBadge status={inv.status} />
                        {inv.isArchived && (
                          <span className="ml-2 text-xs text-[var(--muted)]">
                            archived
                          </span>
                        )}
                      </td>
                      <td>
                        <Button asChild size="sm" variant="ghost">
                          <Link href={`/billing/${String(inv._id)}`}>
                            View / print
                          </Link>
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </TableScroll>
          </CardContent>
        </Card>
      )}

      {tab === "payments" && canBilling && (
        <Card>
          <CardHeader>
            <CardTitle>Payment / receipt history</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <TableScroll className="border-0 shadow-none rounded-none">
              <thead>
                <tr>
                  <th>Receipt</th>
                  <th>Invoice</th>
                  <th>Patient</th>
                  <th>Amount</th>
                  <th>Method</th>
                  <th>Paid at</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => {
                  const patient = p.patientId as unknown as {
                    uhid?: string;
                    firstName?: string;
                    lastName?: string;
                  } | null;
                  const invoice = p.invoiceId as unknown as {
                    _id?: unknown;
                    invoiceNumber?: string;
                  } | null;
                  return (
                    <tr key={String(p._id)}>
                      <td className="font-medium">{p.receiptNumber}</td>
                      <td>
                        {invoice?._id ? (
                          <Link
                            href={`/billing/${String(invoice._id)}`}
                            className="text-[var(--brand-teal)] hover:underline"
                          >
                            {invoice.invoiceNumber}
                          </Link>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td>
                        {patient?.firstName} {patient?.lastName}
                        <div className="text-xs text-[var(--muted)]">
                          {patient?.uhid}
                        </div>
                      </td>
                      <td>{formatCurrency(p.amount)}</td>
                      <td className="uppercase">{p.method}</td>
                      <td>{formatDateTime(p.paidAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </TableScroll>
          </CardContent>
        </Card>
      )}

      {tab === "admissions" && canAdmission && (
        <Card>
          <CardHeader>
            <CardTitle>Admission history (active + discharged)</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <TableScroll className="border-0 shadow-none rounded-none">
              <thead>
                <tr>
                  <th>Admission</th>
                  <th>Patient</th>
                  <th>Ward / Bed</th>
                  <th>Admitted</th>
                  <th>Discharged</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {admissions.map((a) => {
                  const patient = a.patientId as unknown as {
                    uhid?: string;
                    firstName?: string;
                    lastName?: string;
                  } | null;
                  const ward = a.wardId as unknown as {
                    name?: string;
                    code?: string;
                  } | null;
                  const bed = a.bedId as unknown as { bedNumber?: string } | null;
                  return (
                    <tr key={String(a._id)}>
                      <td className="font-medium">{a.admissionNumber}</td>
                      <td>
                        {patient?.firstName} {patient?.lastName}
                        <div className="text-xs text-[var(--muted)]">
                          {patient?.uhid}
                        </div>
                      </td>
                      <td>
                        {ward?.code}-{bed?.bedNumber}
                      </td>
                      <td>{formatDateTime(a.admittedAt)}</td>
                      <td>
                        {a.dischargedAt ? formatDateTime(a.dischargedAt) : "—"}
                      </td>
                      <td>
                        <StatusBadge status={a.status} />
                      </td>
                      <td>
                        <Button asChild size="sm" variant="ghost">
                          <Link href={`/admissions/${String(a._id)}`}>Open</Link>
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </TableScroll>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
