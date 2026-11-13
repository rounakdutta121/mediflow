import { connectDB } from "@/lib/db";
import { Hospital } from "@/models/Hospital";
import type { Types } from "mongoose";

export type LiveSnapshot = {
  revision: number;
  at: string | null;
  currency: string;
};

export async function bumpLive(
  hospitalId: string | Types.ObjectId
): Promise<void> {
  try {
    await connectDB();
    await Hospital.updateOne(
      { _id: hospitalId },
      {
        $inc: { liveRevision: 1 },
        $set: { liveAt: new Date() },
      }
    );
  } catch (error) {
    console.error("Failed to bump live revision", error);
  }
}

export async function getLiveSnapshot(
  hospitalId: string | Types.ObjectId
): Promise<LiveSnapshot> {
  await connectDB();
  const hospital = await Hospital.findById(hospitalId)
    .select("liveRevision liveAt currency")
    .lean();

  return {
    revision: hospital?.liveRevision ?? 0,
    at: hospital?.liveAt ? new Date(hospital.liveAt).toISOString() : null,
    currency: hospital?.currency || "INR",
  };
}
