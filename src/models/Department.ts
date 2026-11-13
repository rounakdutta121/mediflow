import mongoose, { Schema, models, model } from "mongoose";

export interface IDepartment {
  _id: mongoose.Types.ObjectId;
  hospitalId: mongoose.Types.ObjectId;
  name: string;
  code: string;
  description?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const DepartmentSchema = new Schema<IDepartment>(
  {
    hospitalId: { type: Schema.Types.ObjectId, ref: "Hospital", required: true },
    name: { type: String, required: true },
    code: { type: String, required: true },
    description: String,
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

DepartmentSchema.index({ hospitalId: 1, code: 1 }, { unique: true });

export const Department =
  models.Department || model<IDepartment>("Department", DepartmentSchema);
