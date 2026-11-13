import mongoose, { Schema, models, model } from "mongoose";
import type { Role } from "@/lib/permissions";

export interface INotification {
  _id: mongoose.Types.ObjectId;
  hospitalId: mongoose.Types.ObjectId;
  title: string;
  message: string;
  type:
    | "patient"
    | "appointment"
    | "queue"
    | "clinical"
    | "billing"
    | "system";
  href?: string;
  targetRoles: Role[];
  targetUserIds: mongoose.Types.ObjectId[];
  actorId?: mongoose.Types.ObjectId;
  readBy: mongoose.Types.ObjectId[];
  createdAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    hospitalId: { type: Schema.Types.ObjectId, ref: "Hospital", required: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: {
      type: String,
      enum: ["patient", "appointment", "queue", "clinical", "billing", "system"],
      default: "system",
    },
    href: String,
    targetRoles: { type: [String], default: [] },
    targetUserIds: [{ type: Schema.Types.ObjectId, ref: "User" }],
    actorId: { type: Schema.Types.ObjectId, ref: "User" },
    readBy: [{ type: Schema.Types.ObjectId, ref: "User" }],
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

NotificationSchema.index({ hospitalId: 1, createdAt: -1 });

export const Notification =
  models.Notification ||
  model<INotification>("Notification", NotificationSchema);
