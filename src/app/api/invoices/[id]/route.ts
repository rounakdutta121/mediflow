import { Invoice, Payment, Prescription } from "@/models";
import { ApiError, jsonError, jsonOk, requireSession } from "@/lib/api";
import { writeAudit } from "@/lib/audit";
import { notify } from "@/lib/notifications";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSession("billing:read");
    const { id } = await params;
    const invoice = await Invoice.findOne({
      _id: id,
      hospitalId: session.user.hospitalId,
    })
      .populate("patientId", "uhid firstName lastName phone")
      .lean();
    if (!invoice) throw new ApiError("Invoice not found", 404);

    const payments = await Payment.find({ invoiceId: id })
      .sort({ paidAt: -1 })
      .lean();

    return jsonOk({ ...invoice, payments });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSession("billing:write");
    const { id } = await params;

    const invoice = await Invoice.findOne({
      _id: id,
      hospitalId: session.user.hospitalId,
    });
    if (!invoice) throw new ApiError("Invoice not found", 404);

    const invoiceNumber = invoice.invoiceNumber;

    await Promise.all([
      Payment.deleteMany({ invoiceId: invoice._id }),
      Prescription.updateMany(
        { invoiceId: invoice._id },
        { $unset: { invoiceId: 1 } }
      ),
      Invoice.deleteOne({
        _id: invoice._id,
        hospitalId: session.user.hospitalId,
      }),
    ]);

    await writeAudit({
      hospitalId: session.user.hospitalId,
      actorId: session.user.id,
      actorEmail: session.user.email,
      action: "delete",
      resource: "invoice",
      resourceId: id,
      details: { invoiceNumber, hardDelete: true },
    });

    await notify({
      hospitalId: session.user.hospitalId,
      title: "Invoice deleted",
      message: `${invoiceNumber} was permanently deleted`,
      type: "billing",
      href: "/billing",
      targetRoles: ["ACCOUNTANT", "RECEPTIONIST"],
      actorId: session.user.id,
    });

    return jsonOk({ ok: true, invoiceNumber });
  } catch (error) {
    return jsonError(error);
  }
}
