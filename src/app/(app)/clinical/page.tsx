import { connectDB } from "@/lib/db";
import { Encounter } from "@/models";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { hasPermission, type Role } from "@/lib/permissions";
import { requirePagePermission } from "@/lib/page-auth";
import { ClinicalLiveTable } from "./clinical-live-table";

export default async function ClinicalPage() {
  const session = await requirePagePermission("clinical:read");
  await connectDB();

  const filter: Record<string, unknown> = {
    hospitalId: session.user.hospitalId,
  };
  if (session.user.role === "DOCTOR") {
    filter.doctorId = session.user.id;
  }

  const encounters = await Encounter.find(filter)
    .populate("patientId", "uhid firstName lastName")
    .populate("doctorId", "name")
    .sort({ createdAt: -1 })
    .limit(40)
    .lean();

  const canWrite = hasPermission(session.user.role as Role, "clinical:write");
  const initialRows = encounters.map((e) => {
    const patient = e.patientId as unknown as {
      _id?: { toString(): string } | string;
      uhid?: string;
      firstName?: string;
      lastName?: string;
    } | null;
    const doctor = e.doctorId as unknown as {
      _id?: { toString(): string } | string;
      name?: string;
    } | null;
    return {
      _id: String(e._id),
      createdAt: new Date(e.createdAt).toISOString(),
      chiefComplaint: e.chiefComplaint || "",
      status: e.status,
      patientId: patient
        ? {
            _id: patient._id ? String(patient._id) : undefined,
            uhid: patient.uhid || "",
            firstName: patient.firstName || "",
            lastName: patient.lastName || "",
          }
        : undefined,
      doctorId: doctor
        ? {
            name: doctor.name || "",
          }
        : undefined,
    };
  });

  return (
    <div>
      <PageHeader
        title="Clinical / EMR"
        description="Encounter-based consultation notes, diagnosis and prescriptions"
        action={
          canWrite
            ? { href: "/clinical/new", label: "New encounter" }
            : undefined
        }
      />

      <Card>
        <CardContent className="p-0">
          <ClinicalLiveTable initialRows={initialRows} />
        </CardContent>
      </Card>
    </div>
  );
}
