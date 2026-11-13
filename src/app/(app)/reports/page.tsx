import { connectDB } from "@/lib/db";
import { Appointment, Invoice, Patient, Payment } from "@/models";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TableScroll } from "@/components/ui/data-table";
import { formatCurrency } from "@/lib/utils";
import { requirePagePermission } from "@/lib/page-auth";
import mongoose from "mongoose";

export default async function ReportsPage() {
  const session = await requirePagePermission("reports:view");
  await connectDB();

  const start = new Date();
  start.setDate(1);
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  const hospitalObjectId = new mongoose.Types.ObjectId(session.user.hospitalId);

  const [newPatients, appointments, revenue, collections, byStatus] =
    await Promise.all([
      Patient.countDocuments({
        hospitalId: hospitalObjectId,
        createdAt: { $gte: start, $lte: end },
      }),
      Appointment.countDocuments({
        hospitalId: hospitalObjectId,
        scheduledAt: { $gte: start, $lte: end },
      }),
      Invoice.aggregate([
        {
          $match: {
            hospitalId: hospitalObjectId,
            createdAt: { $gte: start, $lte: end },
            status: { $ne: "cancelled" },
          },
        },
        { $group: { _id: null, total: { $sum: "$total" } } },
      ]),
      Payment.aggregate([
        {
          $match: {
            hospitalId: hospitalObjectId,
            paidAt: { $gte: start, $lte: end },
          },
        },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
      Appointment.aggregate([
        {
          $match: {
            hospitalId: hospitalObjectId,
            scheduledAt: { $gte: start, $lte: end },
          },
        },
        { $group: { _id: "$status", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
    ]);

  return (
    <div>
      <PageHeader
        title="Reports & Analytics"
        description="Month-to-date operational and financial summary"
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "New patients", value: newPatients },
          { label: "Appointments", value: appointments },
          {
            label: "Billed revenue",
            value: formatCurrency(revenue[0]?.total || 0),
          },
          {
            label: "Collections",
            value: formatCurrency(collections[0]?.total || 0),
          },
        ].map((kpi) => (
          <Card key={kpi.label}>
            <CardContent className="p-5">
              <p className="text-xs text-slate-500">{kpi.label}</p>
              <p className="mt-1 text-2xl font-semibold text-[var(--brand-navy)]">
                {kpi.value}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Appointments by status (MTD)</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <TableScroll className="border-0 shadow-none rounded-none">
            <thead>
              <tr>
                <th>Status</th>
                <th>Count</th>
              </tr>
            </thead>
            <tbody>
              {byStatus.map((row: { _id: string; count: number }) => (
                <tr key={row._id}>
                  <td className="capitalize">{row._id.replaceAll("_", " ")}</td>
                  <td>{row.count}</td>
                </tr>
              ))}
              {byStatus.length === 0 && (
                <tr>
                  <td colSpan={2} className="py-8 text-center text-slate-500">
                    No appointment data this month
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
