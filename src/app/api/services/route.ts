import { Service } from "@/models";
import { jsonError, jsonOk, requireSession } from "@/lib/api";
import { writeAudit } from "@/lib/audit";
import { notify } from "@/lib/notifications";

export async function GET() {
  try {
    const session = await requireSession(["billing:read", "clinical:read"]);
    const items = await Service.find({
      hospitalId: session.user.hospitalId,
      isActive: true,
    })
      .sort({ name: 1 })
      .lean();
    return jsonOk({ items });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireSession(["billing:write", "settings:manage"]);
    const body = await req.json();
    const taxPercent = Number(body.taxPercent || 0);
    if (!Number.isFinite(taxPercent) || taxPercent < 0 || taxPercent > 100) {
      return jsonError(new Error("Tax % must be between 0 and 100"));
    }
    const service = await Service.create({
      hospitalId: session.user.hospitalId,
      code: body.code,
      name: body.name,
      category: body.category || "other",
      departmentId: body.departmentId,
      price: body.price,
      taxPercent,
    });

    await writeAudit({
      hospitalId: session.user.hospitalId,
      actorId: session.user.id,
      actorEmail: session.user.email,
      action: "create",
      resource: "service",
      resourceId: service._id.toString(),
      details: {
        code: service.code,
        price: service.price,
        taxPercent: service.taxPercent,
      },
    });

    await notify({
      hospitalId: session.user.hospitalId,
      title: "Service catalog updated",
      message: `${service.name} added at ${service.price} (${service.taxPercent}% tax)`,
      type: "billing",
      href: "/settings",
      targetRoles: ["ACCOUNTANT", "RECEPTIONIST"],
      actorId: session.user.id,
    });

    return jsonOk(service, 201);
  } catch (error) {
    return jsonError(error);
  }
}
