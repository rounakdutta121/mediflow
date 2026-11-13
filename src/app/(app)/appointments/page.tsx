import Link from "next/link";
import { connectDB } from "@/lib/db";
import { Appointment } from "@/models";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { TableScroll } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { formatDateTime } from "@/lib/utils";
import { hasPermission, type Role } from "@/lib/permissions";
import { requirePagePermission } from "@/lib/page-auth";
import { AppointmentRowActions } from "@/components/appointment-row-actions";

export default async function AppointmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; status?: string }>;
}) {
  const session = await requirePagePermission("appointments:read");
  const { date, status } = await searchParams;
  await connectDB();

  const selectedDate = date || new Date().toISOString().slice(0, 10);
  const start = new Date(selectedDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(selectedDate);
  end.setHours(23, 59, 59, 999);

  const filter: Record<string, unknown> = {
    hospitalId: session.user.hospitalId,
    scheduledAt: { $gte: start, $lte: end },
  };
  if (status) filter.status = status;
  if (session.user.role === "DOCTOR") filter.doctorId = session.user.id;

  const appointments = await Appointment.find(filter)
    .populate("patientId", "uhid firstName lastName phone")
    .populate("doctorId", "name")
    .populate("departmentId", "name")
    .sort({ scheduledAt: 1 })
    .lean();

  const canWrite = hasPermission(session.user.role as Role, "appointments:write");
  const canDelete = canWrite;

  return (
    <div>
      <PageHeader
        title="Appointments"
        description="Book, manage and track OPD appointments"
        action={
          canWrite
            ? { href: "/appointments/new", label: "Book appointment" }
            : undefined
        }
      />

      <Card className="mb-4">
        <CardContent className="flex flex-wrap gap-2 p-4">
          <form className="flex flex-wrap gap-2">
            <input
              type="date"
              name="date"
              defaultValue={selectedDate}
              className="h-10 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--foreground)]"
            />
            <select
              name="status"
              defaultValue={status || ""}
              className="h-10 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--foreground)]"
            >
              <option value="">All statuses</option>
              <option value="scheduled">Scheduled</option>
              <option value="checked_in">Checked in</option>
              <option value="in_consultation">In consultation</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
              <option value="no_show">No show</option>
            </select>
            <Button type="submit" variant="outline">
              Filter
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <TableScroll className="border-0 shadow-none rounded-none">
            <thead>
              <tr>
                <th>Time</th>
                <th>Patient</th>
                <th>Doctor</th>
                <th>Department</th>
                <th>Token</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {appointments.map((a) => {
                const patient = a.patientId as unknown as {
                  _id: string;
                  uhid: string;
                  firstName: string;
                  lastName: string;
                };
                const doctor = a.doctorId as unknown as { name: string };
                const dept = a.departmentId as unknown as { name: string };
                return (
                  <tr key={String(a._id)}>
                    <td>{formatDateTime(a.scheduledAt)}</td>
                    <td>
                      <Link
                        href={`/patients/${patient?._id}`}
                        className="font-medium text-[var(--brand-teal)] hover:underline"
                      >
                        {patient?.firstName} {patient?.lastName}
                      </Link>
                      <div className="text-xs text-slate-500">{patient?.uhid}</div>
                    </td>
                    <td>{doctor?.name}</td>
                    <td>{dept?.name}</td>
                    <td>{a.tokenNumber ?? "—"}</td>
                    <td>
                      <StatusBadge status={a.status} />
                    </td>
                    <td>
                      <AppointmentRowActions id={String(a._id)} canDelete={canDelete} />
                    </td>
                  </tr>
                );
              })}
              {appointments.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-500">
                    No appointments for this day
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
