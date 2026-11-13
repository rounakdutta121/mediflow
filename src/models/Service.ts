import mongoose, { Schema, models, model } from "mongoose";

export interface IService {
  _id: mongoose.Types.ObjectId;
  hospitalId: mongoose.Types.ObjectId;
  code: string;
  name: string;
  category: "consultation" | "procedure" | "lab" | "pharmacy" | "other";
  departmentId?: mongoose.Types.ObjectId;
  price: number;
  taxPercent: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ServiceSchema = new Schema<IService>(
  {
    hospitalId: { type: Schema.Types.ObjectId, ref: "Hospital", required: true },
    code: { type: String, required: true },
    name: { type: String, required: true },
    category: {
      type: String,
      enum: ["consultation", "procedure", "lab", "pharmacy", "other"],
      default: "consultation",
    },
    departmentId: { type: Schema.Types.ObjectId, ref: "Department" },
    price: { type: Number, required: true, min: 0 },
    taxPercent: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

ServiceSchema.index({ hospitalId: 1, code: 1 }, { unique: true });

export const Service =
  models.Service || model<IService>("Service", ServiceSchema);
