import mongoose, { Schema, models, model } from "mongoose";

export interface IDoctorSchedule {
  _id: mongoose.Types.ObjectId;
  hospitalId: mongoose.Types.ObjectId;
  doctorId: mongoose.Types.ObjectId;
  departmentId: mongoose.Types.ObjectId;
  dayOfWeek: number; // 0=Sun .. 6=Sat
  startTime: string; // HH:mm
  endTime: string;
  slotDurationMinutes: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const DoctorScheduleSchema = new Schema<IDoctorSchedule>(
  {
    hospitalId: { type: Schema.Types.ObjectId, ref: "Hospital", required: true },
    doctorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    departmentId: {
      type: Schema.Types.ObjectId,
      ref: "Department",
      required: true,
    },
    dayOfWeek: { type: Number, required: true, min: 0, max: 6 },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    slotDurationMinutes: { type: Number, default: 15 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

DoctorScheduleSchema.index({ doctorId: 1, dayOfWeek: 1 });

export const DoctorSchedule =
  models.DoctorSchedule ||
  model<IDoctorSchedule>("DoctorSchedule", DoctorScheduleSchema);
