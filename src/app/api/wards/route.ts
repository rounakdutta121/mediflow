import { Ward, Bed } from "@/models";
import { jsonError, jsonOk, requireSession } from "@/lib/api";
import { writeAudit } from "@/lib/audit";

export async function GET() {
  try {
    const session = await requireSession("admission:read");
    const wards = await Ward.find({
      hospitalId: session.user.hospitalId,
      isActive: true,
    })
      .sort({ name: 1 })
      .lean();

    const beds = await Bed.find({
      hospitalId: session.user.hospitalId,
      isActive: true,
    }).lean();

    const items = wards.map((w) => {
      const wardBeds = beds.filter(
        (b) => String(b.wardId) === String(w._id)
      );
      return {
        ...w,
        _id: String(w._id),
        bedCount: wardBeds.length,
        availableCount: wardBeds.filter((b) => b.status === "available").length,
        occupiedCount: wardBeds.filter((b) => b.status === "occupied").length,
      };
    });

    return jsonOk({ items });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireSession("beds:manage");
    const body = await req.json();
    if (!body.name || !body.code) {
      return jsonError(new Error("name and code are required"));
    }

    const ward = await Ward.create({
      hospitalId: session.user.hospitalId,
      name: String(body.name).trim(),
      code: String(body.code).trim().toUpperCase(),
      floor: body.floor,
      genderPolicy: body.genderPolicy || "mixed",
    });

    await writeAudit({
      hospitalId: session.user.hospitalId,
      actorId: session.user.id,
      actorEmail: session.user.email,
      action: "create",
      resource: "ward",
      resourceId: ward._id.toString(),
      details: { code: ward.code },
    });

    return jsonOk(ward, 201);
  } catch (error) {
    return jsonError(error);
  }
}
