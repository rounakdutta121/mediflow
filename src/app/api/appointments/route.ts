import { Appointment } from "@/models";
import { jsonError, jsonOk, parsePagination, requireSession } from "@/lib/api";
import { writeAudit } from "@/lib/audit";
import { notify } from "@/lib/notifications";

export async function GET(req: Request) {
  try {
    const session = await requireSession("appointments:read");
    const { searchParams } = new URL(req.url);
    const { page, limit, skip } = parsePagination(searchParams);
    const status = searchParams.get("status");
    const doctorId = searchParams.get("doctorId");
    const date = searchParams.get("date");
    const view = searchParams.get("view");

    const includeArchived = searchParams.get("includeArchived") === "1";
    const filter: Record<string, unknown> = {
      hospitalId: session.user.hospitalId,
    };
    if (!includeArchived) filter.isArchived = { $ne: true };

    if (status) filter.status = status;
    if (doctorId) filter.doctorId = doctorId;
    if (session.user.role === "DOCTOR") {
      filter.doctorId = session.user.id;
    }
    if (view === "history") {
      const start = new Date();
      start.setDate(start.getDate() - 90);
      start.setHours(0, 0, 0, 0);
      filter.scheduledAt = { $gte: start };
    } else if (date) {
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);
      filter.scheduledAt = { $gte: start, $lte: end };
    }

    const [items, total] = await Promise.all([
      Appointment.find(filter)
        .populate("patientId", "uhid firstName lastName phone")
        .populate("doctorId", "name specialization")
        .populate("departmentId", "name code")
        .sort({ scheduledAt: view === "history" ? -1 : 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Appointment.countDocuments(filter),
    ]);

    return jsonOk({ items, total, page, limit });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireSession("appointments:write");
    const body = await req.json();

    if (!body.patientId || !body.doctorId || !body.departmentId || !body.scheduledAt) {
      return jsonError(
        new Error("patientId, doctorId, departmentId and scheduledAt are required")
      );
    }

    const appointment = await Appointment.create({
      hospitalId: session.user.hospitalId,
      patientId: body.patientId,
      doctorId: body.doctorId,
      departmentId: body.departmentId,
      scheduledAt: new Date(body.scheduledAt),
      durationMinutes: body.durationMinutes || 15,
      type: body.type || "opd",
      status: "scheduled",
      reason: body.reason,
      notes: body.notes,
      createdBy: session.user.id,
    });

    await writeAudit({
      hospitalId: session.user.hospitalId,
      actorId: session.user.id,
      actorEmail: session.user.email,
      action: "create",
      resource: "appointment",
      resourceId: appointment._id.toString(),
    });

    await notify({
      hospitalId: session.user.hospitalId,
      title: "Appointment booked",
      message: `New appointment scheduled`,
      type: "appointment",
      href: "/appointments",
      targetRoles: ["RECEPTIONIST", "DOCTOR"],
      targetUserIds: [appointment.doctorId],
      actorId: session.user.id,
    });

    return jsonOk(appointment, 201);
  } catch (error) {
    return jsonError(error);
  }
}
