import mongoose, { Schema, models, model } from "mongoose";

export interface IAuditLog {
  _id: mongoose.Types.ObjectId;
  hospitalId: mongoose.Types.ObjectId;
  actorId?: mongoose.Types.ObjectId;
  actorEmail?: string;
  action: string;
  resource: string;
  resourceId?: string;
  details?: Record<string, unknown>;
  ip?: string;
  success: boolean;
  createdAt: Date;
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    hospitalId: { type: Schema.Types.ObjectId, ref: "Hospital", required: true },
    actorId: { type: Schema.Types.ObjectId, ref: "User" },
    actorEmail: String,
    action: { type: String, required: true },
    resource: { type: String, required: true },
    resourceId: String,
    details: Schema.Types.Mixed,
    ip: String,
    success: { type: Boolean, default: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

AuditLogSchema.index({ hospitalId: 1, createdAt: -1 });
AuditLogSchema.index({ resource: 1, resourceId: 1 });

export const AuditLog =
  models.AuditLog || model<IAuditLog>("AuditLog", AuditLogSchema);
