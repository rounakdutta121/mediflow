import mongoose, { Schema, models, model } from "mongoose";

export interface IInvoiceItem {
  serviceId?: mongoose.Types.ObjectId;
  description: string;
  quantity: number;
  unitPrice: number;
  taxPercent: number;
  amount: number;
}

export interface IInvoice {
  _id: mongoose.Types.ObjectId;
  hospitalId: mongoose.Types.ObjectId;
  invoiceNumber: string;
  patientId: mongoose.Types.ObjectId;
  encounterId?: mongoose.Types.ObjectId;
  appointmentId?: mongoose.Types.ObjectId;
  items: IInvoiceItem[];
  subtotal: number;
  taxTotal: number;
  discount: number;
  total: number;
  amountPaid: number;
  balance: number;
  status: "draft" | "issued" | "partially_paid" | "paid" | "cancelled";
  notes?: string;
  issuedAt?: Date;
  /** Soft-removed from billing UI; kept forever in Hospital records */
  isArchived?: boolean;
  archivedAt?: Date;
  createdBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const InvoiceSchema = new Schema<IInvoice>(
  {
    hospitalId: { type: Schema.Types.ObjectId, ref: "Hospital", required: true },
    invoiceNumber: { type: String, required: true },
    patientId: { type: Schema.Types.ObjectId, ref: "Patient", required: true },
    encounterId: { type: Schema.Types.ObjectId, ref: "Encounter" },
    appointmentId: { type: Schema.Types.ObjectId, ref: "Appointment" },
    items: [
      {
        serviceId: { type: Schema.Types.ObjectId, ref: "Service" },
        description: { type: String, required: true },
        quantity: { type: Number, default: 1 },
        unitPrice: { type: Number, required: true },
        taxPercent: { type: Number, default: 0 },
        amount: { type: Number, required: true },
      },
    ],
    subtotal: { type: Number, required: true },
    taxTotal: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    total: { type: Number, required: true },
    amountPaid: { type: Number, default: 0 },
    balance: { type: Number, required: true },
    status: {
      type: String,
      enum: ["draft", "issued", "partially_paid", "paid", "cancelled"],
      default: "issued",
    },
    notes: String,
    issuedAt: { type: Date, default: Date.now },
    isArchived: { type: Boolean, default: false },
    archivedAt: Date,
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

InvoiceSchema.index({ hospitalId: 1, invoiceNumber: 1 }, { unique: true });
InvoiceSchema.index({ patientId: 1, createdAt: -1 });
InvoiceSchema.index({ hospitalId: 1, isArchived: 1, createdAt: -1 });

export const Invoice =
  models.Invoice || model<IInvoice>("Invoice", InvoiceSchema);
