import { Hospital } from "@/models";
import { ApiError, jsonError, jsonOk, requireSession } from "@/lib/api";
import { writeAudit } from "@/lib/audit";
import { notify } from "@/lib/notifications";

export async function GET() {
  try {
    const session = await requireSession("settings:manage");
    const hospital = await Hospital.findById(session.user.hospitalId).lean();
    if (!hospital) throw new ApiError("Hospital not found", 404);
    return jsonOk(hospital);
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await requireSession("settings:manage");
    const body = await req.json();

    const $set: Record<string, unknown> = {};
    if (body.name !== undefined) {
      const name = String(body.name || "").trim();
      if (!name) throw new ApiError("Name is required", 400);
      $set.name = name;
    }
    if (body.code !== undefined) {
      const code = String(body.code || "").trim().toUpperCase();
      if (!code) throw new ApiError("Code is required", 400);
      $set.code = code;
    }
    if (body.address !== undefined) $set.address = String(body.address || "").trim();
    if (body.phone !== undefined) $set.phone = String(body.phone || "").trim();
    if (body.email !== undefined) {
      $set.email = String(body.email || "").trim().toLowerCase();
    }
    if (body.timezone !== undefined) {
      $set.timezone = String(body.timezone || "Asia/Kolkata").trim();
    }
    if (body.currency !== undefined) {
      $set.currency = String(body.currency || "INR").trim().toUpperCase();
    }

    const hospital = await Hospital.findByIdAndUpdate(
      session.user.hospitalId,
      { $set },
      { new: true, runValidators: true }
    );
    if (!hospital) throw new ApiError("Hospital not found", 404);

    await writeAudit({
      hospitalId: session.user.hospitalId,
      actorId: session.user.id,
      actorEmail: session.user.email,
      action: "update",
      resource: "hospital",
      resourceId: String(hospital._id),
      details: { fields: Object.keys($set) },
    });

    await notify({
      hospitalId: session.user.hospitalId,
      title: "Hospital settings updated",
      message: `${hospital.name} profile was updated`,
      type: "system",
      href: "/settings",
      targetRoles: ["HOSPITAL_ADMIN"],
      actorId: session.user.id,
    });

    return jsonOk(hospital);
  } catch (error) {
    return jsonError(error);
  }
}
