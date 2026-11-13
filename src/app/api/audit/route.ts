import { AuditLog } from "@/models";
import { jsonError, jsonOk, parsePagination, requireSession } from "@/lib/api";

export async function GET(req: Request) {
  try {
    const session = await requireSession("audit:view");
    const { searchParams } = new URL(req.url);
    const { page, limit, skip } = parsePagination(searchParams);
    const resource = searchParams.get("resource");

    const filter: Record<string, unknown> = {
      hospitalId: session.user.hospitalId,
    };
    if (resource) filter.resource = resource;

    const [items, total] = await Promise.all([
      AuditLog.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      AuditLog.countDocuments(filter),
    ]);

    return jsonOk({ items, total, page, limit });
  } catch (error) {
    return jsonError(error);
  }
}
