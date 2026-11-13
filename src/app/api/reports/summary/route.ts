import { Appointment, Invoice, Patient, Payment } from "@/models";
import { jsonError, jsonOk, requireSession } from "@/lib/api";
import mongoose from "mongoose";

export async function GET(req: Request) {
  try {
    const session = await requireSession("reports:view");
    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const start = from ? new Date(from) : new Date(new Date().setDate(1));
    start.setHours(0, 0, 0, 0);
    const end = to ? new Date(to) : new Date();
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
        ]),
      ]);

    return jsonOk({
      range: { from: start, to: end },
      newPatients,
      appointments,
      revenue: revenue[0]?.total || 0,
      collections: collections[0]?.total || 0,
      appointmentsByStatus: byStatus,
    });
  } catch (error) {
    return jsonError(error);
  }
}
