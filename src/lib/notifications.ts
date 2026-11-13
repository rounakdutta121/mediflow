import { connectDB } from "@/lib/db";
import { Notification } from "@/models/Notification";
import type { Role } from "@/lib/permissions";
import type { Types } from "mongoose";

export async function notify(params: {
  hospitalId: string | Types.ObjectId;
  title: string;
  message: string;
  type?: INotifyType;
  href?: string;
  targetRoles?: Role[];
  targetUserIds?: Array<string | Types.ObjectId>;
  actorId?: string | Types.ObjectId;
}) {
  try {
    await connectDB();
    // Admin always receives every notification
    const roles = Array.from(
      new Set<Role>([...(params.targetRoles || []), "HOSPITAL_ADMIN"])
    );
    await Notification.create({
      hospitalId: params.hospitalId,
      title: params.title,
      message: params.message,
      type: params.type || "system",
      href: params.href,
      targetRoles: roles,
      targetUserIds: params.targetUserIds || [],
      actorId: params.actorId,
      readBy: [],
    });
  } catch (error) {
    console.error("Failed to create notification", error);
  }
}

type INotifyType =
  | "patient"
  | "appointment"
  | "queue"
  | "clinical"
  | "billing"
  | "system";
