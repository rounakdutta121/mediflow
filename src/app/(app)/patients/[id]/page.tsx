import Link from "next/link";
import { notFound } from "next/navigation";
import { connectDB } from "@/lib/db";
import { Appointment, Encounter, Invoice, Patient } from "@/models";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils";
import { hasPermission, type Role } from "@/lib/permissions";
import { requirePagePermission } from "@/lib/page-auth";
import { DeleteButton } from "@/components/delete-button";

export default async function PatientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requirePagePermission("patients:read");
  const { id } = await params;
  await connectDB();

  const patient = await Patient.findOne({
    _id: id,
    hospitalId: session.user.hospitalId,
  }).lean();
  if (!patient) notFound();

  const role = session.user.role as Role;
  const canWrite = hasPermission(role, "patients:write");
  const canBook = hasPermission(role, "appointments:write");
  const canClinical = hasPermission(role, "clinical:write");
  const canBill = hasPermission(role, "billing:write");

  const [appointments, encounters, invoices] = await Promise.all([
    Appointment.find({ patientId: id })
      .populate("doctorId", "name")
      .sort({ scheduledAt: -1 })
      .limit(10)
      .lean(),
    Encounter.find({ patientId: id })
      .populate("doctorId", "name")
      .sort({ createdAt: -1 })
      .limit(10)
      .lean(),
    Invoice.find({ patientId: id }).sort({ createdAt: -1 }).limit(10).lean(),
  ]);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <PageHeader
          title={`${patient.firstName} ${patient.lastName}`}
          description={`UHID ${patient.uhid} · ${patient.phone}`}
        />
        <div className="flex w-full flex-col items-stretch gap-2 sm:w-auto sm:items-end">
          {canWrite && (
            <DeleteButton
              endpoint={`/api/patients/${id}`}
              label="Delete patient"
              confirmMessage="Deactivate this patient record?"
              redirectTo="/patients"
              variant="danger"
            />
          )}
          {canBook && (
            <Button asChild variant="secondary" size="sm">
              <Link href={`/appointments/new?patientId=${id}`}>
                Book appointment
              </Link>
            </Button>
          )}
        </div>
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Profile</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 text-sm">
            <div>
              <p className="text-slate-500">Gender</p>
              <p className="capitalize">{patient.gender}</p>
            </div>
            <div>
              <p className="text-slate-500">Date of birth</p>
              <p>{patient.dateOfBirth ? formatDate(patient.dateOfBirth) : "—"}</p>
            </div>
            <div>
              <p className="text-slate-500">Blood group</p>
              <p>{patient.bloodGroup || "—"}</p>
            </div>
            <div>
              <p className="text-slate-500">Source</p>
              <p className="capitalize">{patient.source}</p>
            </div>
            <div className="sm:col-span-2">
              <p className="text-slate-500">Address</p>
              <p>
                {[patient.address, patient.city, patient.state, patient.pincode]
                  .filter(Boolean)
                  .join(", ") || "—"}
              </p>
            </div>
            <div>
              <p className="mb-1 text-slate-500">Allergies</p>
              <div className="flex flex-wrap gap-1">
                {patient.allergies?.length
                  ? patient.allergies.map((a: string) => (
                      <Badge key={a} variant="danger">
                        {a}
                      </Badge>
                    ))
                  : "None recorded"}
              </div>
            </div>
            <div>
              <p className="mb-1 text-slate-500">Chronic conditions</p>
              <div className="flex flex-wrap gap-1">
                {patient.chronicConditions?.length
                  ? patient.chronicConditions.map((c: string) => (
                      <Badge key={c} variant="warning">
                        {c}
                      </Badge>
                    ))
                  : "None recorded"}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {canClinical && (
              <Button asChild className="w-full" variant="secondary">
                <Link href={`/clinical/new?patientId=${id}`}>Start encounter</Link>
              </Button>
            )}
            {canBill && (
              <Button asChild className="w-full" variant="outline">
                <Link href={`/billing/new?patientId=${id}`}>Create invoice</Link>
              </Button>
            )}
            {!canClinical && !canBill && (
              <p className="text-sm text-slate-500">No quick actions for your role</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Appointments</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {appointments.map((a) => (
              <div key={String(a._id)} className="rounded-lg border border-[var(--border)] p-3">
                <div className="flex items-center justify-between gap-2">
                  <p>{formatDateTime(a.scheduledAt)}</p>
                  <StatusBadge status={a.status} />
                </div>
                <p className="text-slate-500">
                  {(a.doctorId as unknown as { name?: string })?.name}
                </p>
              </div>
            ))}
            {appointments.length === 0 && (
              <p className="text-slate-500">No appointments yet</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Encounters</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {encounters.map((e) => (
              <Link
                key={String(e._id)}
                href={`/clinical/${e._id}`}
                className="block rounded-lg border border-[var(--border)] p-3 hover:bg-[var(--surface-muted)]"
              >
                <div className="flex items-center justify-between gap-2">
                  <p>{formatDate(e.createdAt)}</p>
                  <StatusBadge status={e.status} />
                </div>
                <p className="text-slate-500">{e.chiefComplaint || "No complaint"}</p>
              </Link>
            ))}
            {encounters.length === 0 && (
              <p className="text-slate-500">No encounters yet</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Invoices</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {invoices.map((inv) => (
              <Link
                key={String(inv._id)}
                href={`/billing/${inv._id}`}
                className="block rounded-lg border border-[var(--border)] p-3 hover:bg-[var(--surface-muted)]"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium">{inv.invoiceNumber}</p>
                  <StatusBadge status={inv.status} />
                </div>
                <p className="text-slate-500">{formatCurrency(inv.total)}</p>
              </Link>
            ))}
            {invoices.length === 0 && (
              <p className="text-slate-500">No invoices yet</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
