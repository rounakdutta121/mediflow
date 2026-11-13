import mongoose from "mongoose";
import {
  Appointment,
  Encounter,
  Invoice,
  Patient,
  Payment,
  Prescription,
} from "@/models";

export type CascadeDeleteResult = {
  patientId: string;
  appointments: number;
  encounters: number;
  prescriptions: number;
  invoices: number;
  payments: number;
  patientDeleted: boolean;
};

/**
 * Hard-delete a patient and all linked clinical/front-office/billing records.
 * Queue tokens live on appointments, so removing appointments clears queue too.
 */
export async function deletePatientCascade(
  patientId: string,
  hospitalId: string
): Promise<CascadeDeleteResult | null> {
  const patientObjectId = new mongoose.Types.ObjectId(patientId);
  const hospitalObjectId = new mongoose.Types.ObjectId(hospitalId);

  const patient = await Patient.findOne({
    _id: patientObjectId,
    hospitalId: hospitalObjectId,
  });
  if (!patient) return null;

  const encounterIds = (
    await Encounter.find({ patientId: patientObjectId }).select("_id").lean()
  ).map((e) => e._id);

  const invoiceIds = (
    await Invoice.find({ patientId: patientObjectId }).select("_id").lean()
  ).map((i) => i._id);

  const [appointments, encounters, prescriptions, payments, invoices] =
    await Promise.all([
      Appointment.deleteMany({ patientId: patientObjectId }),
      Encounter.deleteMany({ patientId: patientObjectId }),
      Prescription.deleteMany({
        $or: [
          { patientId: patientObjectId },
          ...(encounterIds.length ? [{ encounterId: { $in: encounterIds } }] : []),
        ],
      }),
      Payment.deleteMany({
        $or: [
          { patientId: patientObjectId },
          ...(invoiceIds.length ? [{ invoiceId: { $in: invoiceIds } }] : []),
        ],
      }),
      Invoice.deleteMany({ patientId: patientObjectId }),
    ]);

  await Patient.deleteOne({ _id: patientObjectId, hospitalId: hospitalObjectId });

  return {
    patientId,
    appointments: appointments.deletedCount || 0,
    encounters: encounters.deletedCount || 0,
    prescriptions: prescriptions.deletedCount || 0,
    invoices: invoices.deletedCount || 0,
    payments: payments.deletedCount || 0,
    patientDeleted: true,
  };
}

/** Remove billing/clinical/front-office rows whose patient no longer exists. */
export async function cleanupOrphanPatientData(hospitalId?: string) {
  const patientFilter = hospitalId
    ? { hospitalId: new mongoose.Types.ObjectId(hospitalId) }
    : {};
  const existing = await Patient.find(patientFilter).select("_id").lean();
  const ids = existing.map((p) => p._id);

  const orphanFilter = hospitalId
    ? {
        hospitalId: new mongoose.Types.ObjectId(hospitalId),
        patientId: { $nin: ids },
      }
    : { patientId: { $nin: ids } };

  const orphanInvoices = await Invoice.find(orphanFilter).select("_id").lean();
  const orphanInvoiceIds = orphanInvoices.map((i) => i._id);

  const [appointments, encounters, prescriptions, payments, invoices] =
    await Promise.all([
      Appointment.deleteMany(orphanFilter),
      Encounter.deleteMany(orphanFilter),
      Prescription.deleteMany(orphanFilter),
      Payment.deleteMany({
        $or: [
          orphanFilter,
          ...(orphanInvoiceIds.length
            ? [{ invoiceId: { $in: orphanInvoiceIds } }]
            : []),
        ],
      }),
      Invoice.deleteMany(orphanFilter),
    ]);

  return {
    appointments: appointments.deletedCount || 0,
    encounters: encounters.deletedCount || 0,
    prescriptions: prescriptions.deletedCount || 0,
    invoices: invoices.deletedCount || 0,
    payments: payments.deletedCount || 0,
  };
}
