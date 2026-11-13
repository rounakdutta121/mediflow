import { Department, User } from "@/models";
import { ApiError, jsonError, jsonOk, requireSession } from "@/lib/api";
import { writeAudit } from "@/lib/audit";
import { notify } from "@/lib/notifications";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSession("departments:write");
    const { id } = await params;
    const body = await req.json();

    const $set: Record<string, unknown> = {};
    if (body.name !== undefined) $set.name = body.name;
    if (body.code !== undefined) $set.code = String(body.code).toUpperCase();
    if (body.description !== undefined) $set.description = body.description;

    const dept = await Department.findOneAndUpdate(
      { _id: id, hospitalId: session.user.hospitalId, isActive: true },
      { $set },
      { new: true }
    );
    if (!dept) throw new ApiError("Department not found", 404);

    await writeAudit({
      hospitalId: session.user.hospitalId,
      actorId: session.user.id,
      actorEmail: session.user.email,
      action: "update",
      resource: "department",
      resourceId: id,
    });

    await notify({
      hospitalId: session.user.hospitalId,
      title: "Department updated",
      message: `${dept.name} (${dept.code}) was updated`,
      type: "system",
      href: "/departments",
      targetRoles: ["RECEPTIONIST", "DOCTOR"],
      actorId: session.user.id,
    });

    return jsonOk(dept);
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSession("departments:write");
    const { id } = await params;

    const assignedDoctors = await User.countDocuments({
      hospitalId: session.user.hospitalId,
      departmentId: id,
      isActive: true,
    });

    if (assignedDoctors > 0) {
      throw new ApiError(
        `Cannot delete: ${assignedDoctors} staff still assigned. Reassign them first.`,
        400
      );
    }

    const dept = await Department.findOneAndUpdate(
      { _id: id, hospitalId: session.user.hospitalId, isActive: true },
      { $set: { isActive: false } },
      { new: true }
    );
    if (!dept) throw new ApiError("Department not found", 404);

    await writeAudit({
      hospitalId: session.user.hospitalId,
      actorId: session.user.id,
      actorEmail: session.user.email,
      action: "delete",
      resource: "department",
      resourceId: id,
    });

    await notify({
      hospitalId: session.user.hospitalId,
      title: "Department deleted",
      message: `${dept.name} (${dept.code}) was removed`,
      type: "system",
      href: "/departments",
      targetRoles: ["RECEPTIONIST", "DOCTOR"],
      actorId: session.user.id,
    });

    return jsonOk({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
