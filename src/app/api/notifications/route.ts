import mongoose from "mongoose";
import { Notification } from "@/models";
import { jsonError, jsonOk, requireSession } from "@/lib/api";
import type { Role } from "@/lib/permissions";

export async function GET(req: Request) {
  try {
    const session = await requireSession();
    const { searchParams } = new URL(req.url);
    const unreadOnly = searchParams.get("unread") === "1";
    const limit = Math.min(50, Number(searchParams.get("limit") || 20));

    const userId = new mongoose.Types.ObjectId(session.user.id);
    const role = session.user.role as Role;

    const visibility: Record<string, unknown> =
      role === "HOSPITAL_ADMIN"
        ? { hospitalId: session.user.hospitalId }
        : {
            hospitalId: session.user.hospitalId,
            $or: [{ targetRoles: role }, { targetUserIds: userId }],
          };

    const filter: Record<string, unknown> = { ...visibility };
    if (unreadOnly) {
      filter.readBy = { $ne: userId };
    }

    const [items, unreadCount] = await Promise.all([
      Notification.find(filter).sort({ createdAt: -1 }).limit(limit).lean(),
      Notification.countDocuments({
        ...visibility,
        readBy: { $ne: userId },
      }),
    ]);

    return jsonOk({
      items: items.map((n) => ({
        ...n,
        isRead: (n.readBy || []).some(
          (id: { toString(): string }) => String(id) === session.user.id
        ),
      })),
      unreadCount,
    });
  } catch (error) {
    return jsonError(error);
  }
}
