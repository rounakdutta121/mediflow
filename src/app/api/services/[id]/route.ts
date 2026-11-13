import { Service } from "@/models";
import { ApiError, jsonError, jsonOk, requireSession } from "@/lib/api";
import { writeAudit } from "@/lib/audit";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSession(["billing:write", "settings:manage"]);
    const { id } = await params;
    const body = await req.json();

    const $set: Record<string, unknown> = {};
    if (body.name !== undefined) $set.name = String(body.name).trim();
    if (body.code !== undefined) $set.code = String(body.code).trim().toUpperCase();
    if (body.category !== undefined) $set.category = body.category;
    if (body.price !== undefined) {
      const price = Number(body.price);
      if (!Number.isFinite(price) || price < 0) {
        throw new ApiError("Price must be a non-negative number", 400);
      }
      $set.price = price;
    }
    if (body.taxPercent !== undefined) {
      const taxPercent = Number(body.taxPercent);
      if (!Number.isFinite(taxPercent) || taxPercent < 0 || taxPercent > 100) {
        throw new ApiError("Tax % must be between 0 and 100", 400);
      }
      $set.taxPercent = taxPercent;
    }
    if (body.isActive !== undefined) $set.isActive = Boolean(body.isActive);

    if (!Object.keys($set).length) {
      throw new ApiError("No fields to update", 400);
    }

    const service = await Service.findOneAndUpdate(
      { _id: id, hospitalId: session.user.hospitalId },
      { $set },
      { new: true }
    );
    if (!service) throw new ApiError("Service not found", 404);

    await writeAudit({
      hospitalId: session.user.hospitalId,
      actorId: session.user.id,
      actorEmail: session.user.email,
      action: "update",
      resource: "service",
      resourceId: id,
      details: $set,
    });

    return jsonOk(service);
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSession(["billing:write", "settings:manage"]);
    const { id } = await params;

    const service = await Service.findOneAndUpdate(
      { _id: id, hospitalId: session.user.hospitalId, isActive: true },
      { $set: { isActive: false } },
      { new: true }
    );
    if (!service) throw new ApiError("Service not found", 404);

    await writeAudit({
      hospitalId: session.user.hospitalId,
      actorId: session.user.id,
      actorEmail: session.user.email,
      action: "delete",
      resource: "service",
      resourceId: id,
      details: { code: service.code, softDelete: true },
    });

    return jsonOk({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
