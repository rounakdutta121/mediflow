import { Invoice, Payment } from "@/models";
import { ApiError, jsonError, jsonOk, requireSession } from "@/lib/api";
import { writeAudit } from "@/lib/audit";
import { notify } from "@/lib/notifications";
import { archiveInvoice } from "@/lib/record-archive";

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

    const archived = await archiveInvoice(id, session.user.hospitalId);
    if (!archived) throw new ApiError("Invoice not found", 404);

    await writeAudit({
      hospitalId: session.user.hospitalId,
      actorId: session.user.id,
      actorEmail: session.user.email,
      action: "archive",
      resource: "invoice",
      resourceId: id,
      details: {
        invoiceNumber: archived.invoiceNumber,
        softArchive: true,
      },
    });

    await notify({
      hospitalId: session.user.hospitalId,
      title: "Invoice archived",
      message: `${archived.invoiceNumber} removed from billing — kept in Hospital records`,
      type: "billing",
      href: "/records?tab=invoices",
      targetRoles: ["ACCOUNTANT", "RECEPTIONIST"],
      actorId: session.user.id,
    });

    return jsonOk({ ok: true, archived: true, invoiceNumber: archived.invoiceNumber });
  } catch (error) {
    return jsonError(error);
  }
}
