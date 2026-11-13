import { Appointment } from "@/models";
import { ApiError, jsonError, jsonOk, requireSession } from "@/lib/api";
import { writeAudit } from "@/lib/audit";
import { notify } from "@/lib/notifications";

export async function POST(req: Request) {
  try {
    const session = await requireSession("queue:manage");
    const { appointmentId } = await req.json();
    if (!appointmentId) throw new ApiError("appointmentId is required");

    const appointment = await Appointment.findOne({
      _id: appointmentId,
      hospitalId: session.user.hospitalId,
    });
    if (!appointment) throw new ApiError("Appointment not found", 404);
    if (["cancelled", "completed", "no_show"].includes(appointment.status)) {
      throw new ApiError("Cannot check in this appointment");
    }

    if (!appointment.tokenNumber) {
      const dayStart = new Date(appointment.scheduledAt);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(appointment.scheduledAt);
      dayEnd.setHours(23, 59, 59, 999);

      const last = await Appointment.findOne({
        hospitalId: session.user.hospitalId,
        doctorId: appointment.doctorId,
        scheduledAt: { $gte: dayStart, $lte: dayEnd },
        tokenNumber: { $ne: null },
      })
        .sort({ tokenNumber: -1 })
        .select("tokenNumber");

      appointment.tokenNumber = (last?.tokenNumber || 0) + 1;
    }

    appointment.status = "checked_in";
    appointment.checkedInAt = new Date();
    await appointment.save();

    await writeAudit({
      hospitalId: session.user.hospitalId,
      actorId: session.user.id,
      actorEmail: session.user.email,
      action: "check_in",
      resource: "appointment",
      resourceId: appointment._id.toString(),
      details: { tokenNumber: appointment.tokenNumber },
    });

    await notify({
      hospitalId: session.user.hospitalId,
      title: "Patient checked in",
      message: `Token ${appointment.tokenNumber} ready in queue`,
      type: "queue",
      href: "/queue",
      targetRoles: ["DOCTOR", "NURSE", "RECEPTIONIST"],
      targetUserIds: [appointment.doctorId],
      actorId: session.user.id,
    });

    return jsonOk(appointment);
  } catch (error) {
    return jsonError(error);
  }
}
