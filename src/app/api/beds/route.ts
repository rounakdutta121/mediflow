import { Bed, Ward } from "@/models";
import { ApiError, jsonError, jsonOk, requireSession } from "@/lib/api";
import { writeAudit } from "@/lib/audit";

export async function GET(req: Request) {
  try {
    const session = await requireSession("admission:read");
    const { searchParams } = new URL(req.url);
    const wardId = searchParams.get("wardId");
    const status = searchParams.get("status");

    const filter: Record<string, unknown> = {
      hospitalId: session.user.hospitalId,
      isActive: true,
    };
    if (wardId) filter.wardId = wardId;
    if (status) filter.status = status;

    const items = await Bed.find(filter)
      .populate("wardId", "name code floor")
      .sort({ bedNumber: 1 })
      .lean();

    return jsonOk({
      items: items.map((b) => ({
        ...b,
        _id: String(b._id),
        wardId:
          b.wardId && typeof b.wardId === "object"
            ? {
                _id: String((b.wardId as { _id: unknown })._id),
                name: (b.wardId as { name?: string }).name,
                code: (b.wardId as { code?: string }).code,
                floor: (b.wardId as { floor?: string }).floor,
              }
            : String(b.wardId),
        currentAdmissionId: b.currentAdmissionId
          ? String(b.currentAdmissionId)
          : undefined,
      })),
    });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireSession("admission:write");
    const body = await req.json();
    if (!body.wardId || !body.bedNumber) {
      return jsonError(new Error("wardId and bedNumber are required"));
    }

    const ward = await Ward.findOne({
      _id: body.wardId,
      hospitalId: session.user.hospitalId,
      isActive: true,
    });
    if (!ward) throw new ApiError("Ward not found", 404);

    const bed = await Bed.create({
      hospitalId: session.user.hospitalId,
      wardId: body.wardId,
      bedNumber: String(body.bedNumber).trim().toUpperCase(),
      bedType: body.bedType || "general",
      status: body.status || "available",
    });

    await writeAudit({
      hospitalId: session.user.hospitalId,
      actorId: session.user.id,
      actorEmail: session.user.email,
      action: "create",
      resource: "bed",
      resourceId: bed._id.toString(),
      details: { wardId: body.wardId, bedNumber: bed.bedNumber },
    });

    return jsonOk(bed, 201);
  } catch (error) {
    return jsonError(error);
  }
}
