import { Department } from "@/models";
import { jsonError, jsonOk, requireSession } from "@/lib/api";
import { writeAudit } from "@/lib/audit";

export async function GET() {
  try {
    const session = await requireSession("departments:read");
    const items = await Department.find({
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
    const session = await requireSession("departments:write");
    const body = await req.json();
    if (!body.name || !body.code) {
      return jsonError(new Error("name and code are required"));
    }

    const dept = await Department.create({
      hospitalId: session.user.hospitalId,
      name: body.name,
      code: String(body.code).toUpperCase(),
      description: body.description,
    });

    await writeAudit({
      hospitalId: session.user.hospitalId,
      actorId: session.user.id,
      actorEmail: session.user.email,
      action: "create",
      resource: "department",
      resourceId: dept._id.toString(),
    });

    return jsonOk(dept, 201);
  } catch (error) {
    return jsonError(error);
  }
}
