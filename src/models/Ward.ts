import mongoose, { Schema, models, model } from "mongoose";

export interface IWard {
  _id: mongoose.Types.ObjectId;
  hospitalId: mongoose.Types.ObjectId;
  name: string;
  code: string;
  floor?: string;
  genderPolicy: "mixed" | "male" | "female";
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const WardSchema = new Schema<IWard>(
  {
    hospitalId: { type: Schema.Types.ObjectId, ref: "Hospital", required: true },
    name: { type: String, required: true },
    code: { type: String, required: true },
    floor: String,
    genderPolicy: {
      type: String,
      enum: ["mixed", "male", "female"],
      default: "mixed",
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

WardSchema.index({ hospitalId: 1, code: 1 }, { unique: true });

export const Ward = models.Ward || model<IWard>("Ward", WardSchema);
