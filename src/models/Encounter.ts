import mongoose, { Schema, models, model } from "mongoose";

export interface IEncounter {
  _id: mongoose.Types.ObjectId;
  hospitalId: mongoose.Types.ObjectId;
  patientId: mongoose.Types.ObjectId;
  doctorId: mongoose.Types.ObjectId;
  appointmentId?: mongoose.Types.ObjectId;
  departmentId?: mongoose.Types.ObjectId;
  status: "open" | "signed" | "amended";
  chiefComplaint?: string;
  history?: string;
  examination?: string;
  assessment?: string;
  plan?: string;
  vitals?: {
    bloodPressure?: string;
    pulse?: number;
    temperature?: number;
    spo2?: number;
    weight?: number;
    height?: number;
  };
  diagnoses: { code?: string; description: string; type: "provisional" | "final" }[];
  signedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const EncounterSchema = new Schema<IEncounter>(
  {
    hospitalId: { type: Schema.Types.ObjectId, ref: "Hospital", required: true },
    patientId: { type: Schema.Types.ObjectId, ref: "Patient", required: true },
    doctorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    appointmentId: { type: Schema.Types.ObjectId, ref: "Appointment" },
    departmentId: { type: Schema.Types.ObjectId, ref: "Department" },
    status: {
      type: String,
      enum: ["open", "signed", "amended"],
      default: "open",
    },
    chiefComplaint: String,
    history: String,
    examination: String,
    assessment: String,
    plan: String,
    vitals: {
      bloodPressure: String,
      pulse: Number,
      temperature: Number,
      spo2: Number,
      weight: Number,
      height: Number,
    },
    diagnoses: [
      {
        code: String,
        description: { type: String, required: true },
        type: {
          type: String,
          enum: ["provisional", "final"],
          default: "provisional",
        },
      },
    ],
    signedAt: Date,
  },
  { timestamps: true }
);

EncounterSchema.index({ patientId: 1, createdAt: -1 });
EncounterSchema.index({ doctorId: 1, createdAt: -1 });

export const Encounter =
  models.Encounter || model<IEncounter>("Encounter", EncounterSchema);
