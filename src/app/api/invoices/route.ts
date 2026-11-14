import { Invoice, getNextSequence } from "@/models";
import { jsonError, jsonOk, parsePagination, requireSession } from "@/lib/api";
import { writeAudit } from "@/lib/audit";

export async function GET(req: Request) {
  try {
    const session = await requireSession("billing:read");
    const { searchParams } = new URL(req.url);
    const { page, limit, skip } = parsePagination(searchParams);
    const patientId = searchParams.get("patientId");
    const status = searchParams.get("status");

    const includeArchived = searchParams.get("includeArchived") === "1";
    const filter: Record<string, unknown> = {
      hospitalId: session.user.hospitalId,
    };
    if (!includeArchived) filter.isArchived = { $ne: true };
    if (patientId) filter.patientId = patientId;
    if (status) filter.status = status;

    const [items, total] = await Promise.all([
      Invoice.find(filter)
        .populate("patientId", "uhid firstName lastName phone")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Invoice.countDocuments(filter),
    ]);

    return jsonOk({ items, total, page, limit });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireSession("billing:write");
    const body = await req.json();

    if (!body.patientId || !body.items?.length) {
      return jsonError(new Error("patientId and items are required"));
    }

    const items = body.items.map(
      (item: {
        serviceId?: string;
        description: string;
        quantity?: number;
        unitPrice: number;
        taxPercent?: number;
      }) => {
        const quantity = item.quantity || 1;
        const taxPercent = item.taxPercent || 0;
        const amount =
          quantity * item.unitPrice * (1 + taxPercent / 100);
        return {
          serviceId: item.serviceId,
          description: item.description,
          quantity,
          unitPrice: item.unitPrice,
          taxPercent,
          amount: Math.round(amount * 100) / 100,
        };
      }
    );

    const subtotal = items.reduce(
      (sum: number, i: { quantity: number; unitPrice: number }) =>
        sum + i.quantity * i.unitPrice,
      0
    );
    const taxTotal = items.reduce(
      (sum: number, i: { amount: number; quantity: number; unitPrice: number }) =>
        sum + (i.amount - i.quantity * i.unitPrice),
      0
    );
    const discount = body.discount || 0;
    const total = Math.round((subtotal + taxTotal - discount) * 100) / 100;

    const seq = await getNextSequence(`invoice:${session.user.hospitalId}`);
    const invoiceNumber = `INV-${String(seq).padStart(6, "0")}`;

    const invoice = await Invoice.create({
      hospitalId: session.user.hospitalId,
      invoiceNumber,
      patientId: body.patientId,
      encounterId: body.encounterId,
      appointmentId: body.appointmentId,
      items,
      subtotal,
      taxTotal: Math.round(taxTotal * 100) / 100,
      discount,
      total,
      amountPaid: 0,
      balance: total,
      status: "issued",
      notes: body.notes,
      createdBy: session.user.id,
    });

    await writeAudit({
      hospitalId: session.user.hospitalId,
      actorId: session.user.id,
      actorEmail: session.user.email,
      action: "create",
      resource: "invoice",
      resourceId: invoice._id.toString(),
      details: { invoiceNumber, total },
    });

    return jsonOk(invoice, 201);
  } catch (error) {
    return jsonError(error);
  }
}
