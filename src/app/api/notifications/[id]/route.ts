import mongoose from "mongoose";
import { Notification } from "@/models";
import { ApiError, jsonError, jsonOk, requireSession } from "@/lib/api";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSession();
    const { id } = await params;
    const body = await req.json();
    const userId = new mongoose.Types.ObjectId(session.user.id);

    if (id === "read-all") {
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
    }

    const notification = await Notification.findOne({
      _id: id,
      hospitalId: session.user.hospitalId,
    });
    if (!notification) throw new ApiError("Notification not found", 404);

    if (body.read) {
      await Notification.updateOne(
        { _id: id },
        { $addToSet: { readBy: userId } }
      );
    }

    return jsonOk({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSession();
    const { id } = await params;

    // Only admin can hard-delete notifications for everyone
    if (session.user.role !== "HOSPITAL_ADMIN") {
      // Soft-hide for user by marking read + user-specific ignore via readBy is enough for MVP
      const userId = new mongoose.Types.ObjectId(session.user.id);
      await Notification.updateOne(
        { _id: id, hospitalId: session.user.hospitalId },
        { $addToSet: { readBy: userId } }
      );
      return jsonOk({ ok: true });
    }

    await Notification.deleteOne({
      _id: id,
      hospitalId: session.user.hospitalId,
    });
    return jsonOk({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
