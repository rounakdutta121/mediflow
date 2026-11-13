import mongoose, { Schema, models, model } from "mongoose";

export interface IHospital {
  _id: mongoose.Types.ObjectId;
  name: string;
  code: string;
  address?: string;
  phone?: string;
  email?: string;
  timezone: string;
  currency: string;
  /** Monotonic counter bumped on every hospital data mutation for live UI sync. */
  liveRevision: number;
  liveAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const HospitalSchema = new Schema<IHospital>(
  {
    name: { type: String, required: true },
    code: { type: String, required: true, unique: true },
    address: String,
    phone: String,
    email: String,
    timezone: { type: String, default: "Asia/Kolkata" },
    currency: { type: String, default: "INR" },
    liveRevision: { type: Number, default: 0 },
    liveAt: { type: Date },
  },
  { timestamps: true }
);

export const Hospital =
  models.Hospital || model<IHospital>("Hospital", HospitalSchema);
