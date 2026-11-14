/**
 * Soft-archive helpers: operational lists hide archived rows;
 * Hospital records always keeps them.
 *
 * Uses collection.updateOne so archive flags persist even if a hot-reloaded
 * Mongoose model was compiled before isArchived existed on the schema.
 */

import mongoose from "mongoose";
import { Appointment, Invoice } from "@/models";

export async function archiveInvoice(
  invoiceId: string,
  hospitalId: string
): Promise<{ invoiceId: string; invoiceNumber: string } | null> {
  if (
    !mongoose.Types.ObjectId.isValid(invoiceId) ||
    !mongoose.Types.ObjectId.isValid(hospitalId)
  ) {
    return null;
  }

  const _id = new mongoose.Types.ObjectId(invoiceId);
  const hospitalObjectId = new mongoose.Types.ObjectId(hospitalId);

  const existing = await Invoice.collection.findOne({
    _id,
    hospitalId: hospitalObjectId,
  });
  if (!existing) return null;

  await Invoice.collection.updateOne(
    { _id, hospitalId: hospitalObjectId },
    {
      $set: {
        isArchived: true,
        archivedAt: new Date(),
        updatedAt: new Date(),
      },
    }
  );

  return {
    invoiceId: String(existing._id),
    invoiceNumber: String(existing.invoiceNumber),
  };
}

export async function archiveAppointment(
  appointmentId: string,
  hospitalId: string
): Promise<{ appointmentId: string } | null> {
  if (
    !mongoose.Types.ObjectId.isValid(appointmentId) ||
    !mongoose.Types.ObjectId.isValid(hospitalId)
  ) {
    return null;
  }

  const _id = new mongoose.Types.ObjectId(appointmentId);
  const hospitalObjectId = new mongoose.Types.ObjectId(hospitalId);

  const existing = await Appointment.collection.findOne({
    _id,
    hospitalId: hospitalObjectId,
  });
  if (!existing) return null;

  await Appointment.collection.updateOne(
    { _id, hospitalId: hospitalObjectId },
    {
      $set: {
        isArchived: true,
        archivedAt: new Date(),
        updatedAt: new Date(),
      },
    }
  );

  return { appointmentId: String(existing._id) };
}

/** Default filter for live billing / appointments boards */
export function activeRecordFilter(
  hospitalId: string,
  extra: Record<string, unknown> = {}
) {
  return {
    hospitalId,
    isArchived: { $ne: true },
    ...extra,
  };
}
