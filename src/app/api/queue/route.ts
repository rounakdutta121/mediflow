import { Appointment } from "@/models";
import { jsonError, jsonOk, requireSession } from "@/lib/api";

export async function GET(req: Request) {
  try {
    const session = await requireSession("queue:manage");
    const { searchParams } = new URL(req.url);
    const doctorId = searchParams.get("doctorId");
    const date = searchParams.get("date") || new Date().toISOString().slice(0, 10);

    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);

    const filter: Record<string, unknown> = {
      hospitalId: session.user.hospitalId,
      scheduledAt: { $gte: start, $lte: end },
      status: { $in: ["scheduled", "confirmed", "checked_in", "in_consultation"] },
    };

    if (session.user.role === "DOCTOR") {
      filter.doctorId = session.user.id;
    } else if (doctorId) {
      filter.doctorId = doctorId;
    }

    const items = await Appointment.find(filter)
      .populate("patientId", "uhid firstName lastName phone")
      .populate("doctorId", "name")
      .populate("departmentId", "name")
      .sort({ tokenNumber: 1, scheduledAt: 1 })
      .lean();

    return jsonOk({ items, date });
  } catch (error) {
    return jsonError(error);
  }
}
