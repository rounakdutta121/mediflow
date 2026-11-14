import Link from "next/link";
import { connectDB } from "@/lib/db";
import { Admission, Bed, Ward } from "@/models";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { TableScroll } from "@/components/ui/data-table";
import { formatDateTime } from "@/lib/utils";
import { hasPermission, type Role } from "@/lib/permissions";
import { requirePagePermission } from "@/lib/page-auth";
import { AdmissionsLiveBoard } from "./admissions-live-board";

export default async function AdmissionsPage() {
  const session = await requirePagePermission("admission:read");
  await connectDB();

  const hospitalId = session.user.hospitalId;
  const canWrite = hasPermission(session.user.role as Role, "admission:write");
  const canManageBeds = hasPermission(session.user.role as Role, "beds:manage");

  const [wards, beds, admissions] = await Promise.all([
    Ward.find({ hospitalId, isActive: true }).sort({ name: 1 }).lean(),
    Bed.find({ hospitalId, isActive: true })
      .populate("wardId", "name code")
      .sort({ bedNumber: 1 })
      .lean(),
    Admission.find({ hospitalId, status: "admitted" })
      .populate("patientId", "uhid firstName lastName phone")
      .populate("wardId", "name code")
      .populate("bedId", "bedNumber bedType")
      .populate("admittingDoctorId", "name")
      .sort({ admittedAt: -1 })
      .limit(50)
      .lean(),
  ]);

  const wardRows = wards.map((w) => {
    const wardBeds = beds.filter((b) => {
      const wardRef = b.wardId as unknown as { _id?: unknown } | string;
      const wid =
        wardRef && typeof wardRef === "object" && wardRef._id
          ? String(wardRef._id)
          : String(b.wardId);
      return wid === String(w._id);
    });
    return {
      _id: String(w._id),
      name: w.name,
      code: w.code,
      floor: w.floor || "",
      bedCount: wardBeds.length,
      availableCount: wardBeds.filter((b) => b.status === "available").length,
      occupiedCount: wardBeds.filter((b) => b.status === "occupied").length,
    };
  });

  const bedRows = beds.map((b) => {
    const ward = b.wardId as unknown as { _id?: unknown; name?: string; code?: string } | null;
    return {
      _id: String(b._id),
      bedNumber: b.bedNumber,
      bedType: b.bedType,
      status: b.status,
      wardId: {
        _id: ward?._id ? String(ward._id) : String(b.wardId),
        name: ward?.name || "",
        code: ward?.code || "",
      },
      currentAdmissionId: b.currentAdmissionId
        ? String(b.currentAdmissionId)
        : undefined,
    };
  });

  const admissionRows = admissions.map((a) => {
    const patient = a.patientId as unknown as {
      _id?: unknown;
      uhid?: string;
      firstName?: string;
      lastName?: string;
      phone?: string;
    } | null;
    const ward = a.wardId as unknown as { name?: string; code?: string } | null;
    const bed = a.bedId as unknown as { bedNumber?: string; bedType?: string } | null;
    const doctor = a.admittingDoctorId as unknown as { name?: string } | null;
    return {
      _id: String(a._id),
      admissionNumber: a.admissionNumber,
      status: a.status,
      admissionType: a.admissionType,
      admittedAt: new Date(a.admittedAt).toISOString(),
      patientId: patient
        ? {
            _id: patient._id ? String(patient._id) : undefined,
            uhid: patient.uhid || "",
            firstName: patient.firstName || "",
            lastName: patient.lastName || "",
            phone: patient.phone || "",
          }
        : undefined,
      wardId: ward ? { name: ward.name || "", code: ward.code || "" } : undefined,
      bedId: bed
        ? { bedNumber: bed.bedNumber || "", bedType: bed.bedType || "" }
        : undefined,
      admittingDoctorId: doctor ? { name: doctor.name || "" } : undefined,
    };
  });

  const available = bedRows.filter((b) => b.status === "available").length;
  const occupied = bedRows.filter((b) => b.status === "occupied").length;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <PageHeader
          title="Admission & Beds"
          description="IPD bed board, active admissions, transfer and discharge"
        />
        <div className="flex flex-wrap gap-2">
          {canManageBeds && (
            <Button asChild variant="outline" size="sm">
              <Link href="/admissions/beds">Manage wards & beds</Link>
            </Button>
          )}
          {canWrite && (
            <Button asChild size="sm">
              <Link href="/admissions/new">Admit patient</Link>
            </Button>
          )}
        </div>
      </div>

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-[var(--muted)]">
              Available beds
            </p>
            <p className="mt-1 text-2xl font-semibold text-emerald-600">
              {available}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-[var(--muted)]">
              Occupied beds
            </p>
            <p className="mt-1 text-2xl font-semibold text-amber-600">
              {occupied}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-[var(--muted)]">
              Active admissions
            </p>
            <p className="mt-1 text-2xl font-semibold">{admissionRows.length}</p>
          </CardContent>
        </Card>
      </div>

      <AdmissionsLiveBoard
        initialWards={wardRows}
        initialBeds={bedRows}
        initialAdmissions={admissionRows}
        canWrite={canWrite}
      />

      {wardRows.length === 0 && (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle>No wards yet</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-[var(--muted)]">
            Run <code className="text-[var(--foreground)]">npm run seed</code>{" "}
            to load demo wards and beds, or create them via the API.
          </CardContent>
        </Card>
      )}

      <Card className="mt-4">
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0">
          <CardTitle>Active admissions</CardTitle>
          <Button asChild size="sm" variant="outline">
            <Link href="/records?tab=admissions">Full admission history</Link>
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <TableScroll className="border-0 shadow-none rounded-none">
            <thead>
              <tr>
                <th>Admission</th>
                <th>Patient</th>
                <th>Ward / Bed</th>
                <th>Doctor</th>
                <th>Admitted</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {admissionRows.map((a) => (
                <tr key={a._id}>
                  <td className="font-medium">{a.admissionNumber}</td>
                  <td>
                    {a.patientId?.firstName} {a.patientId?.lastName}
                    <div className="text-xs text-[var(--muted)]">
                      {a.patientId?.uhid}
                    </div>
                  </td>
                  <td>
                    {a.wardId?.name} · {a.bedId?.bedNumber}
                  </td>
                  <td>{a.admittingDoctorId?.name || "—"}</td>
                  <td>{formatDateTime(a.admittedAt)}</td>
                  <td>
                    <StatusBadge status={a.status} />
                  </td>
                  <td>
                    <Button asChild size="sm" variant="ghost">
                      <Link href={`/admissions/${a._id}`}>Open</Link>
                    </Button>
                  </td>
                </tr>
              ))}
              {admissionRows.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="py-10 text-center text-[var(--muted)]"
                  >
                    No active admissions
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
