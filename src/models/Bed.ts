import mongoose, { Schema, models, model } from "mongoose";

export interface IBed {
  _id: mongoose.Types.ObjectId;
  hospitalId: mongoose.Types.ObjectId;
  wardId: mongoose.Types.ObjectId;
  bedNumber: string;
  bedType: "general" | "semi_private" | "private" | "icu";
  status: "available" | "occupied" | "maintenance" | "reserved";
  currentAdmissionId?: mongoose.Types.ObjectId;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const BedSchema = new Schema<IBed>(
  {
    hospitalId: { type: Schema.Types.ObjectId, ref: "Hospital", required: true },
    wardId: { type: Schema.Types.ObjectId, ref: "Ward", required: true },
    bedNumber: { type: String, required: true },
    bedType: {
      type: String,
      enum: ["general", "semi_private", "private", "icu"],
      default: "general",
    },
    status: {
      type: String,
      enum: ["available", "occupied", "maintenance", "reserved"],
      default: "available",
    },
    currentAdmissionId: { type: Schema.Types.ObjectId, ref: "Admission" },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

BedSchema.index({ hospitalId: 1, wardId: 1, bedNumber: 1 }, { unique: true });
BedSchema.index({ hospitalId: 1, status: 1 });

export const Bed = models.Bed || model<IBed>("Bed", BedSchema);
