import { revalidatePath } from "next/cache";
import { connectDB } from "@/lib/db";
import { Hospital } from "@/models/Hospital";
import mongoose, { type Types } from "mongoose";

export type LiveSnapshot = {
  revision: number;
  at: string | null;
  currency: string;
};

function toObjectId(hospitalId: string | Types.ObjectId) {
  if (hospitalId instanceof mongoose.Types.ObjectId) return hospitalId;
  return new mongoose.Types.ObjectId(String(hospitalId));
}

export async function bumpLive(
  hospitalId: string | Types.ObjectId
): Promise<number> {
  try {
    await connectDB();
    const updated = await Hospital.findOneAndUpdate(
      { _id: toObjectId(hospitalId) },
      {
        $inc: { liveRevision: 1 },
        $set: { liveAt: new Date() },
      },
      { new: true, projection: { liveRevision: 1 } }
    );

    // Invalidate App Router caches so router.refresh() sees fresh RSC data.
    try {
      revalidatePath("/", "layout");
      revalidatePath("/patients");
      revalidatePath("/appointments");
      revalidatePath("/queue");
      revalidatePath("/clinical");
      revalidatePath("/billing");
      revalidatePath("/dashboard");
      revalidatePath("/settings");
      revalidatePath("/staff");
      revalidatePath("/departments");
      revalidatePath("/admissions");
      revalidatePath("/admissions/beds");
      revalidatePath("/records");
    } catch {
      // revalidatePath can throw outside a request context; bump still counts.
    }

    return updated?.liveRevision ?? 0;
  } catch (error) {
    console.error("Failed to bump live revision", error);
    return 0;
  }
}

export async function getLiveSnapshot(
  hospitalId: string | Types.ObjectId
): Promise<LiveSnapshot> {
  await connectDB();
  const hospital = await Hospital.findById(toObjectId(hospitalId))
    .select("liveRevision liveAt currency")
    .lean();

  return {
    revision: hospital?.liveRevision ?? 0,
    at: hospital?.liveAt ? new Date(hospital.liveAt).toISOString() : null,
    currency: hospital?.currency || "INR",
  };
}
