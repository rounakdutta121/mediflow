import mongoose, { Schema, models, model } from "mongoose";

export interface IPatient {
  _id: mongoose.Types.ObjectId;
  hospitalId: mongoose.Types.ObjectId;
  uhid: string;
  firstName: string;
  lastName: string;
  dateOfBirth?: Date;
  gender?: "male" | "female" | "other" | "unknown";
  phone: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  bloodGroup?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  allergies: string[];
  chronicConditions: string[];
  notes?: string;
  source?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const PatientSchema = new Schema<IPatient>(
  {
    hospitalId: { type: Schema.Types.ObjectId, ref: "Hospital", required: true },
    uhid: { type: String, required: true },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    dateOfBirth: Date,
    gender: {
      type: String,
      enum: ["male", "female", "other", "unknown"],
      default: "unknown",
    },
    phone: { type: String, required: true },
    email: String,
    address: String,
    city: String,
    state: String,
    pincode: String,
    bloodGroup: String,
    emergencyContactName: String,
    emergencyContactPhone: String,
    allergies: { type: [String], default: [] },
    chronicConditions: { type: [String], default: [] },
    notes: String,
    source: { type: String, default: "walk-in" },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

PatientSchema.index({ hospitalId: 1, uhid: 1 }, { unique: true });
PatientSchema.index({ hospitalId: 1, phone: 1 });
PatientSchema.index({
  hospitalId: 1,
  firstName: "text",
  lastName: "text",
  uhid: "text",
  phone: "text",
});

export const Patient =
  models.Patient || model<IPatient>("Patient", PatientSchema);
