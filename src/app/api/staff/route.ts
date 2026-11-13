import bcrypt from "bcryptjs";
import { User } from "@/models";
import { jsonError, jsonOk, requireSession } from "@/lib/api";
import { writeAudit } from "@/lib/audit";
import { ROLES } from "@/lib/permissions";

export async function GET(req: Request) {
  try {
    const session = await requireSession("staff:read");
    const { searchParams } = new URL(req.url);
    const role = searchParams.get("role");

    const filter: Record<string, unknown> = {
      hospitalId: session.user.hospitalId,
      isActive: true,
    };
    if (role) filter.role = role;

    const items = await User.find(filter)
      .select("-passwordHash")
      .populate("departmentId", "name code")
      .sort({ name: 1 })
      .lean();

    return jsonOk({ items });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireSession("staff:write");
    const body = await req.json();

    if (!body.email || !body.name || !body.role || !body.password) {
      return jsonError(new Error("email, name, role and password are required"));
    }
    if (!ROLES.includes(body.role)) {
      return jsonError(new Error("Invalid role"));
    }

    const passwordHash = await bcrypt.hash(body.password, 10);
    const user = await User.create({
      hospitalId: session.user.hospitalId,
      email: body.email.toLowerCase(),
      passwordHash,
      name: body.name,
      role: body.role,
      departmentId: body.departmentId || undefined,
      phone: body.phone,
      employeeCode: body.employeeCode,
      specialization: body.specialization,
      qualification: body.qualification,
    });

    await writeAudit({
      hospitalId: session.user.hospitalId,
      actorId: session.user.id,
      actorEmail: session.user.email,
      action: "create",
      resource: "user",
      resourceId: user._id.toString(),
      details: { role: user.role },
    });

    const safe = user.toObject();
    delete (safe as { passwordHash?: string }).passwordHash;
    return jsonOk(safe, 201);
  } catch (error) {
    return jsonError(error);
  }
}
