import { connectDB } from "@/lib/db";
import { AuditLog } from "@/models";
import { bumpLive } from "@/lib/live";
import type { Types } from "mongoose";

export async function writeAudit(params: {
  hospitalId: string | Types.ObjectId;
  actorId?: string | Types.ObjectId;
  actorEmail?: string;
  action: string;
  resource: string;
  resourceId?: string;
  details?: Record<string, unknown>;
  ip?: string;
  success?: boolean;
}) {
  try {
    await connectDB();
    await AuditLog.create({
      hospitalId: params.hospitalId,
      actorId: params.actorId,
      actorEmail: params.actorEmail,
      action: params.action,
      resource: params.resource,
      resourceId: params.resourceId,
      details: params.details,
      ip: params.ip,
      success: params.success ?? true,
    });
    // Drive cross-user live UI updates for every audited mutation.
    await bumpLive(params.hospitalId);
  } catch (error) {
    console.error("Failed to write audit log", error);
  }
}
