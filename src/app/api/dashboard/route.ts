import {
  Appointment,
  Patient,
  Invoice,
  Encounter,
  Payment,
} from "@/models";
import { jsonError, jsonOk, requireSession } from "@/lib/api";

export async function GET() {
  try {
    const session = await requireSession("dashboard:view");
    const hospitalId = session.user.hospitalId;

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const doctorFilter =
      session.user.role === "DOCTOR" ? { doctorId: session.user.id } : {};

    const [
      patientsTotal,
      appointmentsToday,
      checkedIn,
      openEncounters,
      outstanding,
      collectionsToday,
      recentAppointments,
    ] = await Promise.all([
      Patient.countDocuments({ hospitalId, isActive: true }),
      Appointment.countDocuments({
        hospitalId,
        ...doctorFilter,
        scheduledAt: { $gte: todayStart, $lte: todayEnd },
        status: { $nin: ["cancelled"] },
      }),
      Appointment.countDocuments({
        hospitalId,
        ...doctorFilter,
        scheduledAt: { $gte: todayStart, $lte: todayEnd },
        status: { $in: ["checked_in", "in_consultation"] },
      }),
      Encounter.countDocuments({
        hospitalId,
        ...doctorFilter,
        status: "open",
      }),
      Invoice.aggregate([
        {
          $match: {
            hospitalId: new (await import("mongoose")).default.Types.ObjectId(
              hospitalId
            ),
            status: { $in: ["issued", "partially_paid"] },
          },
        },
        { $group: { _id: null, total: { $sum: "$balance" } } },
      ]),
      Payment.aggregate([
        {
          $match: {
            hospitalId: new (await import("mongoose")).default.Types.ObjectId(
              hospitalId
            ),
            paidAt: { $gte: todayStart, $lte: todayEnd },
          },
        },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
      Appointment.find({
        hospitalId,
        ...doctorFilter,
        scheduledAt: { $gte: todayStart, $lte: todayEnd },
      })
        .populate("patientId", "uhid firstName lastName")
        .populate("doctorId", "name")
        .sort({ scheduledAt: 1 })
        .limit(8)
        .lean(),
    ]);

    return jsonOk({
      kpis: {
        patientsTotal,
        appointmentsToday,
        checkedIn,
        openEncounters,
        outstandingBalance: outstanding[0]?.total || 0,
        collectionsToday: collectionsToday[0]?.total || 0,
      },
      recentAppointments,
    });
  } catch (error) {
    return jsonError(error);
  }
}
