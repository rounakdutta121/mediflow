import mongoose, { Schema, models, model } from "mongoose";

export type AppointmentStatus =
  | "scheduled"
  | "confirmed"
  | "checked_in"
  | "in_consultation"
  | "completed"
  | "cancelled"
  | "no_show";

export interface IAppointment {
  _id: mongoose.Types.ObjectId;
  hospitalId: mongoose.Types.ObjectId;
  patientId: mongoose.Types.ObjectId;
  doctorId: mongoose.Types.ObjectId;
  departmentId: mongoose.Types.ObjectId;
  scheduledAt: Date;
  durationMinutes: number;
  type: "opd" | "follow_up" | "teleconsult" | "walk_in";
  status: AppointmentStatus;
  reason?: string;
  notes?: string;
  tokenNumber?: number;
  checkedInAt?: Date;
  createdBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const AppointmentSchema = new Schema<IAppointment>(
  {
    hospitalId: { type: Schema.Types.ObjectId, ref: "Hospital", required: true },
    patientId: { type: Schema.Types.ObjectId, ref: "Patient", required: true },
    doctorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    departmentId: {
      type: Schema.Types.ObjectId,
      ref: "Department",
      required: true,
    },
    scheduledAt: { type: Date, required: true },
    durationMinutes: { type: Number, default: 15 },
    type: {
      type: String,
      enum: ["opd", "follow_up", "teleconsult", "walk_in"],
      default: "opd",
    },
    status: {
      type: String,
      enum: [
        "scheduled",
        "confirmed",
        "checked_in",
        "in_consultation",
        "completed",
        "cancelled",
        "no_show",
      ],
      default: "scheduled",
    },
    reason: String,
    notes: String,
    tokenNumber: Number,
    checkedInAt: Date,
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

AppointmentSchema.index({ hospitalId: 1, scheduledAt: 1 });
AppointmentSchema.index({ doctorId: 1, scheduledAt: 1 });
AppointmentSchema.index({ patientId: 1, scheduledAt: -1 });
AppointmentSchema.index({ hospitalId: 1, status: 1, scheduledAt: 1 });

export const Appointment =
  models.Appointment || model<IAppointment>("Appointment", AppointmentSchema);
