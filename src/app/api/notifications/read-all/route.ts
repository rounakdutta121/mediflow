import mongoose from "mongoose";
import { Notification } from "@/models";
import { jsonError, jsonOk, requireSession } from "@/lib/api";

export async function POST() {
  try {
    const session = await requireSession();
    const userId = new mongoose.Types.ObjectId(session.user.id);

    await Notification.updateMany(
      {
        hospitalId: session.user.hospitalId,
        $or: [
          { targetRoles: session.user.role },
          { targetUserIds: userId },
        ],
        readBy: { $ne: userId },
      },
      { $addToSet: { readBy: userId } }
    );

    return jsonOk({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
