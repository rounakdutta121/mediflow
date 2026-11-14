import mongoose, { Schema, models, model } from "mongoose";

export interface IAdmission {
  _id: mongoose.Types.ObjectId;
  hospitalId: mongoose.Types.ObjectId;
  admissionNumber: string;
  patientId: mongoose.Types.ObjectId;
  wardId: mongoose.Types.ObjectId;
  bedId: mongoose.Types.ObjectId;
  admittingDoctorId?: mongoose.Types.ObjectId;
  departmentId?: mongoose.Types.ObjectId;
  encounterId?: mongoose.Types.ObjectId;
  status: "admitted" | "discharged" | "transferred";
  admissionType: "emergency" | "elective" | "transfer";
  chiefComplaint?: string;
  provisionalDiagnosis?: string;
  notes?: string;
  admittedAt: Date;
  dischargedAt?: Date;
  dischargeSummary?: string;
  createdBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const AdmissionSchema = new Schema<IAdmission>(
  {
    hospitalId: { type: Schema.Types.ObjectId, ref: "Hospital", required: true },
    admissionNumber: { type: String, required: true },
    patientId: { type: Schema.Types.ObjectId, ref: "Patient", required: true },
    wardId: { type: Schema.Types.ObjectId, ref: "Ward", required: true },
    bedId: { type: Schema.Types.ObjectId, ref: "Bed", required: true },
    admittingDoctorId: { type: Schema.Types.ObjectId, ref: "User" },
    departmentId: { type: Schema.Types.ObjectId, ref: "Department" },
    encounterId: { type: Schema.Types.ObjectId, ref: "Encounter" },
    status: {
      type: String,
      enum: ["admitted", "discharged", "transferred"],
      default: "admitted",
    },
    admissionType: {
      type: String,
      enum: ["emergency", "elective", "transfer"],
      default: "elective",
    },
    chiefComplaint: String,
    provisionalDiagnosis: String,
    notes: String,
    admittedAt: { type: Date, default: Date.now },
    dischargedAt: Date,
    dischargeSummary: String,
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

AdmissionSchema.index({ hospitalId: 1, admissionNumber: 1 }, { unique: true });
AdmissionSchema.index({ hospitalId: 1, status: 1, admittedAt: -1 });
AdmissionSchema.index({ patientId: 1, status: 1 });
AdmissionSchema.index({ bedId: 1, status: 1 });

export const Admission =
  models.Admission || model<IAdmission>("Admission", AdmissionSchema);
