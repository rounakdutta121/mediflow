import {
  Invoice,
  Prescription,
  Service,
  getNextSequence,
} from "@/models";
import type { Types } from "mongoose";

export async function createInvoiceFromEncounter(params: {
  hospitalId: string | Types.ObjectId;
  patientId: string | Types.ObjectId;
  encounterId: string | Types.ObjectId;
  appointmentId?: string | Types.ObjectId;
  createdBy?: string | Types.ObjectId;
}) {
  const prescriptions = await Prescription.find({
    encounterId: params.encounterId,
    hospitalId: params.hospitalId,
    status: "signed",
    $or: [{ invoiceId: null }, { invoiceId: { $exists: false } }],
  });

  const items: Array<{
    serviceId?: Types.ObjectId;
    description: string;
    quantity: number;
    unitPrice: number;
    taxPercent: number;
    amount: number;
  }> = [];

  // Always include consultation if catalogue has one
  const consult = await Service.findOne({
    hospitalId: params.hospitalId,
    code: "OPD-CONS",
    isActive: true,
  });
  if (consult) {
    const taxPercent = consult.taxPercent || 0;
    items.push({
      serviceId: consult._id,
      description: consult.name,
      quantity: 1,
      unitPrice: consult.price,
      taxPercent,
      amount:
        Math.round(consult.price * (1 + taxPercent / 100) * 100) / 100,
    });
  }

  for (const rx of prescriptions) {
    for (const item of rx.items) {
      const qty = item.quantity || 1;
      const unitPrice = Number(item.unitPrice || 0);
      if (unitPrice <= 0 && !item.serviceId) continue;

      let price = unitPrice;
      let taxPercent = Number(item.taxPercent || 0);
      let serviceId = item.serviceId;
      let description = item.medicineName;

      if (item.serviceId) {
        const service = await Service.findById(item.serviceId);
        if (service) {
          price = unitPrice > 0 ? unitPrice : service.price;
          if (!taxPercent) taxPercent = service.taxPercent || 0;
          description = `${item.medicineName} (${service.name})`;
          serviceId = service._id;
        }
      }

      const amount = Math.round(qty * price * (1 + taxPercent / 100) * 100) / 100;
      items.push({
        serviceId,
        description,
        quantity: qty,
        unitPrice: price,
        taxPercent,
        amount,
      });
    }
  }

  if (!items.length) return null;

  const subtotal = items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
  const taxTotal = items.reduce(
    (s, i) => s + (i.amount - i.quantity * i.unitPrice),
    0
  );
  const total = Math.round((subtotal + taxTotal) * 100) / 100;
  const seq = await getNextSequence(`invoice:${params.hospitalId}`);
  const invoiceNumber = `INV-${String(seq).padStart(6, "0")}`;

  const invoice = await Invoice.create({
    hospitalId: params.hospitalId,
    invoiceNumber,
    patientId: params.patientId,
    encounterId: params.encounterId,
    appointmentId: params.appointmentId,
    items,
    subtotal: Math.round(subtotal * 100) / 100,
    taxTotal: Math.round(taxTotal * 100) / 100,
    discount: 0,
    total,
    amountPaid: 0,
    balance: total,
    status: "issued",
    notes: "Auto-generated on encounter sign-off",
    createdBy: params.createdBy,
  });

  await Prescription.updateMany(
    {
      _id: { $in: prescriptions.map((p) => p._id) },
    },
    { $set: { invoiceId: invoice._id } }
  );

  return invoice;
}
