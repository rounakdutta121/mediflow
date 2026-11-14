import { Bed } from "@/models";
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

    const bed = await Bed.findOne({
      _id: id,
      hospitalId: session.user.hospitalId,
      isActive: true,
    });
    if (!bed) throw new ApiError("Bed not found", 404);

    if (body.status !== undefined) {
      if (bed.status === "occupied" && body.status !== "occupied") {
        throw new ApiError(
          "Occupied beds can only be freed by discharging the patient",
          400
        );
      }
      if (body.status === "occupied" && bed.status !== "occupied") {
        throw new ApiError(
          "Beds become occupied only when a patient is admitted",
          400
        );
      }
      bed.status = body.status;
    }
    if (body.bedType !== undefined) bed.bedType = body.bedType;
    if (body.bedNumber !== undefined) {
      bed.bedNumber = String(body.bedNumber).trim().toUpperCase();
    }
    if (body.wardId !== undefined) {
      if (bed.status === "occupied") {
        throw new ApiError("Cannot move an occupied bed to another ward", 400);
      }
      bed.wardId = body.wardId;
    }
    if (body.isActive === false) {
      if (bed.status === "occupied") {
        throw new ApiError("Cannot deactivate an occupied bed", 400);
      }
      bed.isActive = false;
    }

    await bed.save();

    await writeAudit({
      hospitalId: session.user.hospitalId,
      actorId: session.user.id,
      actorEmail: session.user.email,
      action: "update",
      resource: "bed",
      resourceId: id,
      details: body,
    });

    return jsonOk(bed);
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

    const bed = await Bed.findOne({
      _id: id,
      hospitalId: session.user.hospitalId,
      isActive: true,
    });
    if (!bed) throw new ApiError("Bed not found", 404);
    if (bed.status === "occupied") {
      throw new ApiError("Cannot delete an occupied bed", 400);
    }

    bed.isActive = false;
    bed.status = "maintenance";
    await bed.save();

    await writeAudit({
      hospitalId: session.user.hospitalId,
      actorId: session.user.id,
      actorEmail: session.user.email,
      action: "delete",
      resource: "bed",
      resourceId: id,
      details: { softDelete: true, bedNumber: bed.bedNumber },
    });

    return jsonOk({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
