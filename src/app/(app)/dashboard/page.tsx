import Image from "next/image";
import { requirePagePermission } from "@/lib/page-auth";
import { connectDB } from "@/lib/db";
import {
  Appointment,
  Encounter,
  Invoice,
  Patient,
  Payment,
} from "@/models";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { TableScroll } from "@/components/ui/data-table";
import { FadeIn } from "@/components/motion/fade-in";
import mongoose from "mongoose";
import {
  CalendarDays,
  ClipboardList,
  IndianRupee,
  Users,
} from "lucide-react";

export default async function DashboardPage() {
  const session = await requirePagePermission("dashboard:view");
  await connectDB();
  const hospitalId = session.user.hospitalId;
  const hospitalObjectId = new mongoose.Types.ObjectId(hospitalId);

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const doctorFilter =
    session.user.role === "DOCTOR" ? { doctorId: session.user.id } : {};

  const [
    patientsTotal,
    appointmentsToday,
    openEncounters,
    outstanding,
    collectionsToday,
    recentAppointments,
  ] = await Promise.all([
    Patient.countDocuments({ hospitalId, isActive: true }),
    Appointment.countDocuments({
      hospitalId,
      ...doctorFilter,
      isArchived: { $ne: true },
      scheduledAt: { $gte: todayStart, $lte: todayEnd },
      status: { $nin: ["cancelled"] },
    }),
    Encounter.countDocuments({
      hospitalId,
      ...doctorFilter,
      status: "open",
    }),
    Invoice.aggregate([
      {
        $match: {
          hospitalId: hospitalObjectId,
          isArchived: { $ne: true },
          status: { $in: ["issued", "partially_paid"] },
        },
      },
      { $group: { _id: null, total: { $sum: "$balance" } } },
    ]),
    Payment.aggregate([
      {
        $match: {
          hospitalId: hospitalObjectId,
          paidAt: { $gte: todayStart, $lte: todayEnd },
        },
      },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),
    Appointment.find({
      hospitalId,
      ...doctorFilter,
      isArchived: { $ne: true },
      scheduledAt: { $gte: todayStart, $lte: todayEnd },
    })
      .populate("patientId", "uhid firstName lastName")
      .populate("doctorId", "name")
      .sort({ scheduledAt: 1 })
      .limit(8)
      .lean(),
  ]);

  const kpis = [
    {
      label: "Registered patients",
      value: patientsTotal,
      icon: Users,
      tone: "from-cyan-500/20 to-cyan-500/5 text-cyan-700 dark:text-cyan-300",
    },
    {
      label: "Appointments today",
      value: appointmentsToday,
      icon: CalendarDays,
      tone: "from-emerald-500/20 to-emerald-500/5 text-emerald-700 dark:text-emerald-300",
    },
    {
      label: "Open encounters",
      value: openEncounters,
      icon: ClipboardList,
      tone: "from-sky-500/20 to-sky-500/5 text-sky-700 dark:text-sky-300",
    },
    {
      label: "Collections today",
      value: formatCurrency(collectionsToday[0]?.total || 0),
      icon: IndianRupee,
      tone: "from-teal-500/20 to-teal-500/5 text-teal-700 dark:text-teal-300",
    },
  ];

  return (
    <FadeIn>
      <div className="relative overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-sm)] sm:p-7">
        <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-[42%] opacity-90 md:block">
          <Image
            src="/brand/dashboard-motif.jpg"
            alt=""
            fill
            className="object-cover object-center opacity-40 dark:opacity-30"
            sizes="40vw"
          />
          <div className="absolute inset-0 bg-gradient-to-l from-transparent via-[var(--surface)]/70 to-[var(--surface)]" />
        </div>
        <div className="relative z-10 max-w-xl">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--brand)]">
            Operations pulse
          </p>
          <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-[1.75rem]">
            Welcome, {session.user.name.split(" ")[0]}
          </h1>
          <p className="mt-1.5 text-sm text-[var(--muted)]">
            Live snapshot for MediFlow General Hospital — patients, queue,
            clinical and collections.
          </p>
        </div>
      </div>

      <div className="mt-6 mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Card key={kpi.label} className="overflow-hidden">
              <CardContent className="flex items-center gap-4 p-5">
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${kpi.tone}`}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-[var(--muted)]">{kpi.label}</p>
                  <p className="truncate font-display text-xl font-semibold tracking-tight">
                    {kpi.value}
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Today&apos;s appointments</CardTitle>
          </CardHeader>
          <CardContent className="p-0 pb-2">
            <TableScroll className="border-0 shadow-none rounded-none" maxHeight={420}>
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Patient</th>
                  <th>Doctor</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {recentAppointments.length === 0 && (
                  <tr>
                    <td colSpan={4} className="!py-10 text-center text-[var(--muted)]">
                      No appointments scheduled for today
                    </td>
                  </tr>
                )}
                {recentAppointments.map((appt) => {
                  const patient = appt.patientId as unknown as {
                    uhid: string;
                    firstName: string;
                    lastName: string;
                  };
                  const doctor = appt.doctorId as unknown as { name: string };
                  return (
                    <tr key={String(appt._id)}>
                      <td className="whitespace-nowrap">
                        {formatDateTime(appt.scheduledAt)}
                      </td>
                      <td>
                        {patient?.firstName} {patient?.lastName}
                        <div className="text-xs text-[var(--muted)]">
                          {patient?.uhid}
                        </div>
                      </td>
                      <td>{doctor?.name}</td>
                      <td>
                        <StatusBadge status={appt.status} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </TableScroll>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Finance pulse</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] p-4">
              <p className="text-xs text-[var(--muted)]">Outstanding dues</p>
              <p className="font-display text-2xl font-semibold tracking-tight">
                {formatCurrency(outstanding[0]?.total || 0)}
              </p>
            </div>
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4">
              <p className="text-xs text-emerald-700 dark:text-emerald-300">
                Collected today
              </p>
              <p className="font-display text-2xl font-semibold tracking-tight text-emerald-800 dark:text-emerald-200">
                {formatCurrency(collectionsToday[0]?.total || 0)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </FadeIn>
  );
}
