import bcrypt from "bcryptjs";
import { User } from "@/models";
import { ApiError, jsonError, jsonOk, requireSession } from "@/lib/api";
import { writeAudit } from "@/lib/audit";
import { notify } from "@/lib/notifications";
import { ROLES } from "@/lib/permissions";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSession("staff:write");
    const { id } = await params;
    const body = await req.json();

    if (body.role && !ROLES.includes(body.role)) {
      throw new ApiError("Invalid role");
    }

    // Prevent self-lockout: admin cannot demote/delete themselves into no-access via this path
    if (id === session.user.id && body.role && body.role !== session.user.role) {
      throw new ApiError("You cannot change your own role");
    }

    const $set: Record<string, unknown> = {};
    if (body.name !== undefined) $set.name = body.name;
    if (body.email !== undefined) $set.email = String(body.email).toLowerCase();
    if (body.role !== undefined) $set.role = body.role;
    if (body.phone !== undefined) $set.phone = body.phone;
    if (body.employeeCode !== undefined) $set.employeeCode = body.employeeCode;
    if (body.specialization !== undefined) $set.specialization = body.specialization;
    if (body.qualification !== undefined) $set.qualification = body.qualification;
    if (body.departmentId !== undefined) {
      $set.departmentId = body.departmentId || null;
    }
    if (body.password) {
      $set.passwordHash = await bcrypt.hash(body.password, 10);
    }

    const user = await User.findOneAndUpdate(
      { _id: id, hospitalId: session.user.hospitalId, isActive: true },
      { $set },
      { new: true }
    ).select("-passwordHash");

    if (!user) throw new ApiError("Staff member not found", 404);

    await writeAudit({
      hospitalId: session.user.hospitalId,
      actorId: session.user.id,
      actorEmail: session.user.email,
      action: "update",
      resource: "user",
      resourceId: id,
      details: { role: user.role },
    });

    await notify({
      hospitalId: session.user.hospitalId,
      title: "Staff profile updated",
      message: `${user.name} (${user.role.replaceAll("_", " ")}) was updated`,
      type: "system",
      href: "/staff",
      targetRoles: ["RECEPTIONIST", "DOCTOR"],
      actorId: session.user.id,
    });

    return jsonOk(user);
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSession("staff:write");
    const { id } = await params;

    if (id === session.user.id) {
      throw new ApiError("You cannot delete your own account");
    }

    const user = await User.findOneAndUpdate(
      { _id: id, hospitalId: session.user.hospitalId, isActive: true },
      { $set: { isActive: false } },
      { new: true }
    ).select("-passwordHash");

    if (!user) throw new ApiError("Staff member not found", 404);

    await writeAudit({
      hospitalId: session.user.hospitalId,
      actorId: session.user.id,
      actorEmail: session.user.email,
      action: "delete",
      resource: "user",
      resourceId: id,
    });

    await notify({
      hospitalId: session.user.hospitalId,
      title: "Staff deactivated",
      message: `${user.name} was deactivated`,
      type: "system",
      href: "/staff",
      targetRoles: ["RECEPTIONIST"],
      actorId: session.user.id,
    });

    return jsonOk({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
