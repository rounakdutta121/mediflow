import Link from "next/link";
import { connectDB } from "@/lib/db";
import { Encounter } from "@/models";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { TableScroll } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { formatDateTime } from "@/lib/utils";
import { hasPermission, type Role } from "@/lib/permissions";
import { requirePagePermission } from "@/lib/page-auth";

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
          <TableScroll className="border-0 shadow-none rounded-none">
            <thead>
              <tr>
                <th>When</th>
                <th>Patient</th>
                <th>Doctor</th>
                <th>Complaint</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {encounters.map((e) => {
                const patient = e.patientId as unknown as {
                  _id: string;
                  uhid: string;
                  firstName: string;
                  lastName: string;
                };
                const doctor = e.doctorId as unknown as { name: string };
                return (
                  <tr key={String(e._id)}>
                    <td>{formatDateTime(e.createdAt)}</td>
                    <td>
                      {patient?.firstName} {patient?.lastName}
                      <div className="text-xs text-slate-500">{patient?.uhid}</div>
                    </td>
                    <td>{doctor?.name}</td>
                    <td>{e.chiefComplaint || "—"}</td>
                    <td>
                      <StatusBadge status={e.status} />
                    </td>
                    <td>
                      <Button asChild size="sm" variant="ghost">
                        <Link href={`/clinical/${e._id}`}>Open</Link>
                      </Button>
                    </td>
                  </tr>
                );
              })}
              {encounters.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-500">
                    No encounters yet
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
