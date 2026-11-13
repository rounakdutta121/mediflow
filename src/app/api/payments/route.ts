import { Invoice, Payment, getNextSequence } from "@/models";
import { ApiError, jsonError, jsonOk, requireSession } from "@/lib/api";
import { writeAudit } from "@/lib/audit";
import { notify } from "@/lib/notifications";

export async function POST(req: Request) {
  try {
    const session = await requireSession("billing:write");
    const body = await req.json();

    if (!body.invoiceId || !body.amount) {
      throw new ApiError("invoiceId and amount are required");
    }

    const invoice = await Invoice.findOne({
      _id: body.invoiceId,
      hospitalId: session.user.hospitalId,
    });
    if (!invoice) throw new ApiError("Invoice not found", 404);
    if (invoice.status === "cancelled") {
      throw new ApiError("Cannot pay a cancelled invoice");
    }

    const amount = Number(body.amount);
    if (amount <= 0 || amount > invoice.balance + 0.001) {
      throw new ApiError("Invalid payment amount");
    }

    const seq = await getNextSequence(`receipt:${session.user.hospitalId}`);
    const receiptNumber = `RCP-${String(seq).padStart(6, "0")}`;

    const payment = await Payment.create({
      hospitalId: session.user.hospitalId,
      invoiceId: invoice._id,
      patientId: invoice.patientId,
      receiptNumber,
      amount,
      method: body.method || "cash",
      reference: body.reference,
      notes: body.notes,
      receivedBy: session.user.id,
    });

    invoice.amountPaid += amount;
    invoice.balance = Math.round((invoice.total - invoice.amountPaid) * 100) / 100;
    invoice.status =
      invoice.balance <= 0
        ? "paid"
        : invoice.amountPaid > 0
          ? "partially_paid"
          : invoice.status;
    await invoice.save();

    await writeAudit({
      hospitalId: session.user.hospitalId,
      actorId: session.user.id,
      actorEmail: session.user.email,
      action: "create",
      resource: "payment",
      resourceId: payment._id.toString(),
      details: { receiptNumber, amount, invoiceId: invoice._id.toString() },
    });

    await notify({
      hospitalId: session.user.hospitalId,
      title: "Payment received",
      message: `${receiptNumber} · ₹${amount} for ${invoice.invoiceNumber}`,
      type: "billing",
      href: `/billing/${invoice._id}`,
      targetRoles: ["ACCOUNTANT", "RECEPTIONIST"],
      actorId: session.user.id,
    });

    return jsonOk({ payment, invoice }, 201);
  } catch (error) {
    return jsonError(error);
  }
}
