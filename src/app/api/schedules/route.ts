import { DoctorSchedule } from "@/models";
import { jsonError, jsonOk, requireSession } from "@/lib/api";
import { writeAudit } from "@/lib/audit";

export async function GET(req: Request) {
  try {
    const session = await requireSession(["staff:read", "appointments:read"]);
    const { searchParams } = new URL(req.url);
    const doctorId = searchParams.get("doctorId");

    const filter: Record<string, unknown> = {
      hospitalId: session.user.hospitalId,
      isActive: true,
    };
    if (doctorId) filter.doctorId = doctorId;

    const items = await DoctorSchedule.find(filter)
      .populate("doctorId", "name specialization")
      .populate("departmentId", "name code")
      .sort({ dayOfWeek: 1, startTime: 1 })
      .lean();

    return jsonOk({ items });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireSession("staff:write");
    const body = await req.json();

    const schedule = await DoctorSchedule.create({
      hospitalId: session.user.hospitalId,
      doctorId: body.doctorId,
      departmentId: body.departmentId,
      dayOfWeek: body.dayOfWeek,
      startTime: body.startTime,
      endTime: body.endTime,
      slotDurationMinutes: body.slotDurationMinutes || 15,
    });

    await writeAudit({
      hospitalId: session.user.hospitalId,
      actorId: session.user.id,
      actorEmail: session.user.email,
      action: "create",
      resource: "schedule",
      resourceId: schedule._id.toString(),
    });

    return jsonOk(schedule, 201);
  } catch (error) {
    return jsonError(error);
  }
}
