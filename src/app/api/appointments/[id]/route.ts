import { Appointment } from "@/models";
import { ApiError, jsonError, jsonOk, requireSession } from "@/lib/api";
import { writeAudit } from "@/lib/audit";
import { notify } from "@/lib/notifications";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSession("appointments:write");
    const { id } = await params;
    const body = await req.json();

    const allowed = [
      "scheduledAt",
      "status",
      "reason",
      "notes",
      "type",
      "doctorId",
      "departmentId",
      "durationMinutes",
    ] as const;

    const $set: Record<string, unknown> = {};
    for (const key of allowed) {
      if (body[key] !== undefined) {
        $set[key] = key === "scheduledAt" ? new Date(body[key]) : body[key];
      }
    }

    const appointment = await Appointment.findOneAndUpdate(
      { _id: id, hospitalId: session.user.hospitalId },
      { $set },
      { new: true }
    );

    if (!appointment) throw new ApiError("Appointment not found", 404);

    await writeAudit({
      hospitalId: session.user.hospitalId,
      actorId: session.user.id,
      actorEmail: session.user.email,
      action: "update",
      resource: "appointment",
      resourceId: id,
      details: $set,
    });

    return jsonOk(appointment);
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSession("appointments:write");
    const { id } = await params;

    const appointment = await Appointment.findOneAndDelete({
      _id: id,
      hospitalId: session.user.hospitalId,
    });
    if (!appointment) throw new ApiError("Appointment not found", 404);

    await writeAudit({
      hospitalId: session.user.hospitalId,
      actorId: session.user.id,
      actorEmail: session.user.email,
      action: "delete",
      resource: "appointment",
      resourceId: id,
    });

    await notify({
      hospitalId: session.user.hospitalId,
      title: "Appointment deleted",
      message: `An appointment was removed by ${session.user.name}`,
      type: "appointment",
      href: "/appointments",
      targetRoles: ["RECEPTIONIST", "DOCTOR"],
      actorId: session.user.id,
    });

    return jsonOk({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
