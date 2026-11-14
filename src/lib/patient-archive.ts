import mongoose from "mongoose";
import { Admission, Bed, Patient } from "@/models";

/**
 * Soft-archive a patient so hospital history (appointments, invoices, admissions)
 * remains available. Active IPD stays are discharged and beds freed.
 */
export async function archivePatient(
  patientId: string,
  hospitalId: string
): Promise<{
  patientId: string;
  freedBeds: number;
  dischargedAdmissions: number;
} | null> {
  const patientObjectId = new mongoose.Types.ObjectId(patientId);
  const hospitalObjectId = new mongoose.Types.ObjectId(hospitalId);

  const patient = await Patient.findOne({
    _id: patientObjectId,
    hospitalId: hospitalObjectId,
  });
  if (!patient) return null;

  const activeAdmissions = await Admission.find({
    patientId: patientObjectId,
    hospitalId: hospitalObjectId,
    status: "admitted",
  });

  for (const admission of activeAdmissions) {
    admission.status = "discharged";
    admission.dischargedAt = new Date();
    admission.dischargeSummary =
      admission.dischargeSummary ||
      "Auto-discharged because patient record was archived";
    await admission.save();

    await Bed.updateOne(
      { _id: admission.bedId, hospitalId: hospitalObjectId },
      {
        $set: { status: "available" },
        $unset: { currentAdmissionId: 1 },
      }
    );
  }

  patient.isActive = false;
  await patient.save();

  return {
    patientId,
    freedBeds: activeAdmissions.length,
    dischargedAdmissions: activeAdmissions.length,
  };
}
