import { config } from "dotenv";
import { resolve } from "path";
import mongoose from "mongoose";

config({ path: resolve(".env.local") });

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error("Missing MONGODB_URI");
  process.exit(1);
}

await mongoose.connect(uri);

const patients = mongoose.connection.collection("patients");
const appointments = mongoose.connection.collection("appointments");
const encounters = mongoose.connection.collection("encounters");
const prescriptions = mongoose.connection.collection("prescriptions");
const invoices = mongoose.connection.collection("invoices");
const payments = mongoose.connection.collection("payments");

const existing = await patients.find({}, { projection: { _id: 1 } }).toArray();
const ids = existing.map((p) => p._id);
console.log("Active patients in DB:", ids.length);

const orphanInvoices = await invoices
  .find({ patientId: { $nin: ids } }, { projection: { _id: 1, invoiceNumber: 1 } })
  .toArray();
console.log("Orphan invoices:", orphanInvoices.length, orphanInvoices.slice(0, 5));

const orphanInvoiceIds = orphanInvoices.map((i) => i._id);
const orphanFilter = { patientId: { $nin: ids } };

const [a, e, rx, pay, inv] = await Promise.all([
  appointments.deleteMany(orphanFilter),
  encounters.deleteMany(orphanFilter),
  prescriptions.deleteMany(orphanFilter),
  payments.deleteMany({
    $or: [
      orphanFilter,
      ...(orphanInvoiceIds.length
        ? [{ invoiceId: { $in: orphanInvoiceIds } }]
        : []),
    ],
  }),
  invoices.deleteMany(orphanFilter),
]);

console.log("DELETED", {
  appointments: a.deletedCount,
  encounters: e.deletedCount,
  prescriptions: rx.deletedCount,
  payments: pay.deletedCount,
  invoices: inv.deletedCount,
});

await mongoose.disconnect();
