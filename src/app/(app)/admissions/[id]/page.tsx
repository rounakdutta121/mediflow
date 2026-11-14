import Link from "next/link";
import { notFound } from "next/navigation";
import { connectDB } from "@/lib/db";
import { Admission } from "@/models";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { formatDateTime } from "@/lib/utils";
import { hasPermission, type Role } from "@/lib/permissions";
import { requirePagePermission } from "@/lib/page-auth";
import { AdmissionActions } from "./admission-actions";
import { ArrowLeft } from "lucide-react";

export default async function AdmissionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requirePagePermission("admission:read");
  const { id } = await params;
  await connectDB();

  const admission = await Admission.findOne({
    _id: id,
    hospitalId: session.user.hospitalId,
  })
    .populate("patientId", "uhid firstName lastName phone gender address")
    .populate("wardId", "name code floor")
    .populate("bedId", "bedNumber bedType status")
    .populate("admittingDoctorId", "name")
    .populate("departmentId", "name")
    .lean();

  if (!admission) notFound();

  const canWrite = hasPermission(session.user.role as Role, "admission:write");
  const patient = admission.patientId as unknown as {
    _id?: unknown;
    uhid: string;
    firstName: string;
    lastName: string;
    phone?: string;
    gender?: string;
    address?: string;
  };
  const ward = admission.wardId as unknown as {
    name: string;
    code: string;
    floor?: string;
  };
  const bed = admission.bedId as unknown as {
    _id?: unknown;
    bedNumber: string;
    bedType: string;
    status: string;
  };
  const doctor = admission.admittingDoctorId as unknown as { name?: string } | null;
  const dept = admission.departmentId as unknown as { name?: string } | null;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <Button asChild variant="ghost" size="sm" className="-ml-2">
            <Link href="/admissions">
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to admissions
            </Link>
          </Button>
          <PageHeader
            title={admission.admissionNumber}
            description={`${patient.firstName} ${patient.lastName} · ${patient.uhid}`}
          />
        </div>
        <StatusBadge status={admission.status} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Admission details</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 text-sm">
            <div>
              <p className="text-[var(--muted)]">Patient</p>
              <p className="font-medium">
                {patient.firstName} {patient.lastName}
              </p>
              <p className="text-xs text-[var(--muted)]">
                {patient.uhid} · {patient.phone || "—"}
              </p>
            </div>
            <div>
              <p className="text-[var(--muted)]">Type</p>
              <p className="capitalize">
                {admission.admissionType.replaceAll("_", " ")}
              </p>
            </div>
            <div>
              <p className="text-[var(--muted)]">Ward / Bed</p>
              <p className="font-medium">
                {ward.name} ({ward.code}
                {ward.floor ? ` · Floor ${ward.floor}` : ""}) · {bed.bedNumber}
              </p>
              <p className="text-xs capitalize text-[var(--muted)]">
                {bed.bedType.replaceAll("_", " ")} · bed {bed.status}
              </p>
            </div>
            <div>
              <p className="text-[var(--muted)]">Admitting doctor</p>
              <p>{doctor?.name || "—"}</p>
            </div>
            <div>
              <p className="text-[var(--muted)]">Department</p>
              <p>{dept?.name || "—"}</p>
            </div>
            <div>
              <p className="text-[var(--muted)]">Admitted at</p>
              <p>{formatDateTime(admission.admittedAt)}</p>
            </div>
            {admission.dischargedAt && (
              <div>
                <p className="text-[var(--muted)]">Discharged at</p>
                <p>{formatDateTime(admission.dischargedAt)}</p>
              </div>
            )}
            <div className="sm:col-span-2">
              <p className="text-[var(--muted)]">Chief complaint</p>
              <p>{admission.chiefComplaint || "—"}</p>
            </div>
            <div className="sm:col-span-2">
              <p className="text-[var(--muted)]">Provisional diagnosis</p>
              <p>{admission.provisionalDiagnosis || "—"}</p>
            </div>
            <div className="sm:col-span-2">
              <p className="text-[var(--muted)]">Notes</p>
              <p className="whitespace-pre-wrap">{admission.notes || "—"}</p>
            </div>
            {admission.dischargeSummary && (
              <div className="sm:col-span-2">
                <p className="text-[var(--muted)]">Discharge summary</p>
                <p className="whitespace-pre-wrap">{admission.dischargeSummary}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          {canWrite && admission.status === "admitted" && (
            <AdmissionActions
              admissionId={String(admission._id)}
              currentBedId={String(bed._id || admission.bedId)}
            />
          )}
          <Card>
            <CardHeader>
              <CardTitle>Quick links</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button asChild variant="outline" className="w-full justify-start">
                <Link href={`/patients/${String(patient._id || "")}`}>
                  Patient profile
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full justify-start">
                <Link href="/admissions">Bed board</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
