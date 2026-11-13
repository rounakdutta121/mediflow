import { notFound } from "next/navigation";
import { connectDB } from "@/lib/db";
import { Encounter, Prescription } from "@/models";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { formatDateTime } from "@/lib/utils";
import { hasPermission, type Role } from "@/lib/permissions";
import { requirePagePermission } from "@/lib/page-auth";
import { EncounterWorkspace } from "./encounter-workspace";

export default async function EncounterDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requirePagePermission("clinical:read");
  const { id } = await params;
  await connectDB();

  const encounter = await Encounter.findOne({
    _id: id,
    hospitalId: session.user.hospitalId,
  })
    .populate("patientId", "uhid firstName lastName phone allergies")
    .populate("doctorId", "name specialization")
    .lean();

  if (!encounter) notFound();

  const prescriptions = await Prescription.find({ encounterId: id })
    .sort({ createdAt: -1 })
    .lean();
  const canWrite = hasPermission(session.user.role as Role, "clinical:write");
  const patient = encounter.patientId as unknown as {
    _id: string;
    uhid: string;
    firstName: string;
    lastName: string;
  };
  const doctor = encounter.doctorId as unknown as { name: string };

  return (
    <div>
      <PageHeader
        title={`Encounter · ${patient.firstName} ${patient.lastName}`}
        description={`${patient.uhid} · ${formatDateTime(encounter.createdAt)} · Dr. ${doctor.name}`}
      />

      <div className="mb-4">
        <StatusBadge status={encounter.status} />
      </div>

      <EncounterWorkspace
        canWrite={canWrite}
        patientId={String(patient._id)}
        encounter={{
          _id: String(encounter._id),
          status: encounter.status,
          chiefComplaint: encounter.chiefComplaint,
          history: encounter.history,
          examination: encounter.examination,
          assessment: encounter.assessment,
          plan: encounter.plan,
          diagnoses: encounter.diagnoses?.map(
            (d: { description: string; type: string }) => ({
              description: d.description,
              type: d.type,
            })
          ),
          vitals: encounter.vitals,
        }}
        prescriptions={prescriptions.map((rx) => ({
          _id: String(rx._id),
          status: rx.status,
          invoiceId: rx.invoiceId ? String(rx.invoiceId) : undefined,
          items: rx.items.map(
            (item: {
              medicineName: string;
              dosage?: string;
              frequency?: string;
              duration?: string;
              unitPrice?: number;
              amount?: number;
            }) => ({
              medicineName: item.medicineName,
              dosage: item.dosage,
              frequency: item.frequency,
              duration: item.duration,
              unitPrice: item.unitPrice,
              amount: item.amount,
            })
          ),
        }))}
      />
    </div>
  );
}
