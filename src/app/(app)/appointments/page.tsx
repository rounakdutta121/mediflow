import Link from "next/link";
import { connectDB } from "@/lib/db";
import { Appointment } from "@/models";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { hasPermission, type Role } from "@/lib/permissions";
import { requirePagePermission } from "@/lib/page-auth";
import { AppointmentsLiveTable } from "./appointments-live-table";

export default async function AppointmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; status?: string; view?: string }>;
}) {
  const session = await requirePagePermission("appointments:read");
  const { date, status, view } = await searchParams;
  await connectDB();

  const historyView = view === "history";
  const selectedDate = date || new Date().toISOString().slice(0, 10);

  const filter: Record<string, unknown> = {
    hospitalId: session.user.hospitalId,
  };

  if (historyView) {
    const start = new Date();
    start.setDate(start.getDate() - 90);
    start.setHours(0, 0, 0, 0);
    filter.scheduledAt = { $gte: start };
  } else {
    const start = new Date(selectedDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(selectedDate);
    end.setHours(23, 59, 59, 999);
    filter.scheduledAt = { $gte: start, $lte: end };
  }

  if (status) filter.status = status;
  if (session.user.role === "DOCTOR") filter.doctorId = session.user.id;

  const appointments = await Appointment.find(filter)
    .populate("patientId", "uhid firstName lastName phone")
    .populate("doctorId", "name")
    .populate("departmentId", "name")
    .sort({ scheduledAt: historyView ? -1 : 1 })
    .limit(historyView ? 100 : 200)
    .lean();

  const canWrite = hasPermission(session.user.role as Role, "appointments:write");
  const canDelete = canWrite;

  const initialRows = appointments.map((a) => {
    const patient = a.patientId as unknown as {
      _id?: { toString(): string } | string;
      uhid?: string;
      firstName?: string;
      lastName?: string;
    } | null;
    const doctor = a.doctorId as unknown as { name?: string } | null;
    const dept = a.departmentId as unknown as { name?: string } | null;
    return {
      _id: String(a._id),
      scheduledAt: new Date(a.scheduledAt).toISOString(),
      status: a.status,
      tokenNumber: a.tokenNumber,
      patientId: patient
        ? {
            _id: patient._id ? String(patient._id) : undefined,
            uhid: patient.uhid || "",
            firstName: patient.firstName || "",
            lastName: patient.lastName || "",
          }
        : undefined,
      doctorId: doctor ? { name: doctor.name || "" } : undefined,
      departmentId: dept ? { name: dept.name || "" } : undefined,
    };
  });

  return (
    <div>
      <PageHeader
        title="Appointments"
        description={
          historyView
            ? "Last 90 days of appointment history"
            : "Book, manage and track OPD appointments"
        }
        action={
          canWrite
            ? { href: "/appointments/new", label: "Book appointment" }
            : undefined
        }
      />

      <Card className="mb-4">
        <CardContent className="flex flex-wrap items-center gap-2 p-4">
          <form className="flex flex-wrap gap-2">
            {!historyView && (
              <input
                type="date"
                name="date"
                defaultValue={selectedDate}
                className="h-10 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--foreground)]"
              />
            )}
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
            {historyView && <input type="hidden" name="view" value="history" />}
            <Button type="submit" variant="outline">
              Filter
            </Button>
          </form>
          <div className="ml-auto flex flex-wrap gap-2">
            <Button asChild size="sm" variant={historyView ? "outline" : "default"}>
              <Link href="/appointments">Today / by date</Link>
            </Button>
            <Button asChild size="sm" variant={historyView ? "default" : "outline"}>
              <Link href="/appointments?view=history">90-day history</Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link href="/records?tab=appointments">Full records</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <AppointmentsLiveTable
            initialRows={initialRows}
            date={historyView ? "" : selectedDate}
            status={status}
            canDelete={canDelete}
            history={historyView}
          />
        </CardContent>
      </Card>
    </div>
  );
}
