import mongoose, { Schema, models, model } from "mongoose";

export interface IPrescriptionItem {
  medicineName: string;
  dosage?: string;
  frequency?: string;
  duration?: string;
  instructions?: string;
  quantity?: number;
  serviceId?: mongoose.Types.ObjectId;
  unitPrice?: number;
  amount?: number;
}

export interface IPrescription {
  _id: mongoose.Types.ObjectId;
  hospitalId: mongoose.Types.ObjectId;
  patientId: mongoose.Types.ObjectId;
  doctorId: mongoose.Types.ObjectId;
  encounterId: mongoose.Types.ObjectId;
  items: IPrescriptionItem[];
  notes?: string;
  status: "draft" | "signed" | "cancelled";
  signedAt?: Date;
  invoiceId?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const PrescriptionSchema = new Schema<IPrescription>(
  {
    hospitalId: { type: Schema.Types.ObjectId, ref: "Hospital", required: true },
    patientId: { type: Schema.Types.ObjectId, ref: "Patient", required: true },
    doctorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    encounterId: {
      type: Schema.Types.ObjectId,
      ref: "Encounter",
      required: true,
    },
    items: [
      {
        medicineName: { type: String, required: true },
        dosage: String,
        frequency: String,
        duration: String,
        instructions: String,
        quantity: { type: Number, default: 1 },
        serviceId: { type: Schema.Types.ObjectId, ref: "Service" },
        unitPrice: { type: Number, default: 0 },
        amount: { type: Number, default: 0 },
      },
    ],
    notes: String,
    status: {
      type: String,
      enum: ["draft", "signed", "cancelled"],
      default: "draft",
    },
    signedAt: Date,
    invoiceId: { type: Schema.Types.ObjectId, ref: "Invoice" },
  },
  { timestamps: true }
);

PrescriptionSchema.index({ encounterId: 1 });
PrescriptionSchema.index({ patientId: 1, createdAt: -1 });

export const Prescription =
  models.Prescription ||
  model<IPrescription>("Prescription", PrescriptionSchema);
