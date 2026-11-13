import mongoose, { Schema, models, model } from "mongoose";

export interface IPayment {
  _id: mongoose.Types.ObjectId;
  hospitalId: mongoose.Types.ObjectId;
  invoiceId: mongoose.Types.ObjectId;
  patientId: mongoose.Types.ObjectId;
  receiptNumber: string;
  amount: number;
  method: "cash" | "card" | "upi" | "bank_transfer" | "other";
  reference?: string;
  notes?: string;
  receivedBy?: mongoose.Types.ObjectId;
  paidAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentSchema = new Schema<IPayment>(
  {
    hospitalId: { type: Schema.Types.ObjectId, ref: "Hospital", required: true },
    invoiceId: { type: Schema.Types.ObjectId, ref: "Invoice", required: true },
    patientId: { type: Schema.Types.ObjectId, ref: "Patient", required: true },
    receiptNumber: { type: String, required: true },
    amount: { type: Number, required: true, min: 0 },
    method: {
      type: String,
      enum: ["cash", "card", "upi", "bank_transfer", "other"],
      default: "cash",
    },
    reference: String,
    notes: String,
    receivedBy: { type: Schema.Types.ObjectId, ref: "User" },
    paidAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

PaymentSchema.index({ hospitalId: 1, receiptNumber: 1 }, { unique: true });
PaymentSchema.index({ invoiceId: 1 });

export const Payment =
  models.Payment || model<IPayment>("Payment", PaymentSchema);
