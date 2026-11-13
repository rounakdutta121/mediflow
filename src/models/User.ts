import mongoose, { Schema, models, model } from "mongoose";
import type { Role } from "@/lib/permissions";

export interface IUser {
  _id: mongoose.Types.ObjectId;
  hospitalId: mongoose.Types.ObjectId;
  email: string;
  passwordHash: string;
  name: string;
  role: Role;
  departmentId?: mongoose.Types.ObjectId;
  phone?: string;
  isActive: boolean;
  employeeCode?: string;
  specialization?: string;
  qualification?: string;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    hospitalId: { type: Schema.Types.ObjectId, ref: "Hospital", required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    passwordHash: { type: String, required: true },
    name: { type: String, required: true },
    role: {
      type: String,
      required: true,
      enum: [
        "HOSPITAL_ADMIN",
        "RECEPTIONIST",
        "DOCTOR",
        "NURSE",
        "ACCOUNTANT",
        "AUDITOR",
      ],
    },
    departmentId: { type: Schema.Types.ObjectId, ref: "Department" },
    phone: String,
    isActive: { type: Boolean, default: true },
    employeeCode: String,
    specialization: String,
    qualification: String,
  },
  { timestamps: true }
);

UserSchema.index({ hospitalId: 1, role: 1 });

export const User = models.User || model<IUser>("User", UserSchema);
