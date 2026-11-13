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
    const session = await requireSession("billing:write");
    const body = await req.json();
    const service = await Service.create({
      hospitalId: session.user.hospitalId,
      code: body.code,
      name: body.name,
      category: body.category || "other",
      departmentId: body.departmentId,
      price: body.price,
      taxPercent: body.taxPercent || 0,
    });

    await writeAudit({
      hospitalId: session.user.hospitalId,
      actorId: session.user.id,
      actorEmail: session.user.email,
      action: "create",
      resource: "service",
      resourceId: service._id.toString(),
      details: { code: service.code, price: service.price },
    });

    await notify({
      hospitalId: session.user.hospitalId,
      title: "Service catalog updated",
      message: `${service.name} added at ${service.price}`,
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
