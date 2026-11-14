import { Ward, Bed } from "@/models";
import { ApiError, jsonError, jsonOk, requireSession } from "@/lib/api";
import { writeAudit } from "@/lib/audit";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSession("beds:manage");
    const { id } = await params;
    const body = await req.json();

    const $set: Record<string, unknown> = {};
    if (body.name !== undefined) $set.name = String(body.name).trim();
    if (body.code !== undefined) {
      $set.code = String(body.code).trim().toUpperCase();
    }
    if (body.floor !== undefined) $set.floor = String(body.floor || "");
    if (body.genderPolicy !== undefined) $set.genderPolicy = body.genderPolicy;

    const ward = await Ward.findOneAndUpdate(
      { _id: id, hospitalId: session.user.hospitalId, isActive: true },
      { $set },
      { new: true }
    );
    if (!ward) throw new ApiError("Ward not found", 404);

    await writeAudit({
      hospitalId: session.user.hospitalId,
      actorId: session.user.id,
      actorEmail: session.user.email,
      action: "update",
      resource: "ward",
      resourceId: id,
      details: $set,
    });

    return jsonOk(ward);
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSession("beds:manage");
    const { id } = await params;

    const occupied = await Bed.countDocuments({
      hospitalId: session.user.hospitalId,
      wardId: id,
      isActive: true,
      status: "occupied",
    });
    if (occupied > 0) {
      throw new ApiError("Cannot remove a ward with occupied beds", 400);
    }

    const ward = await Ward.findOneAndUpdate(
      { _id: id, hospitalId: session.user.hospitalId, isActive: true },
      { $set: { isActive: false } },
      { new: true }
    );
    if (!ward) throw new ApiError("Ward not found", 404);

    await Bed.updateMany(
      { hospitalId: session.user.hospitalId, wardId: id, isActive: true },
      { $set: { isActive: false, status: "maintenance" } }
    );

    await writeAudit({
      hospitalId: session.user.hospitalId,
      actorId: session.user.id,
      actorEmail: session.user.email,
      action: "delete",
      resource: "ward",
      resourceId: id,
      details: { softDelete: true },
    });

    return jsonOk({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
