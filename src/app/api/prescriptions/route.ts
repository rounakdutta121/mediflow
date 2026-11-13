import { Prescription } from "@/models";
import { jsonError, jsonOk, requireSession } from "@/lib/api";
import { writeAudit } from "@/lib/audit";
import { notify } from "@/lib/notifications";

export async function POST(req: Request) {
  try {
    const session = await requireSession("clinical:write");
    const body = await req.json();

    if (!body.patientId || !body.encounterId || !body.items?.length) {
      return jsonError(
        new Error("patientId, encounterId and items are required")
      );
    }

    const items = body.items.map(
      (item: {
        medicineName: string;
        dosage?: string;
        frequency?: string;
        duration?: string;
        instructions?: string;
        quantity?: number;
        serviceId?: string;
        unitPrice?: number;
        taxPercent?: number;
      }) => {
        const quantity = Number(item.quantity || 1);
        const unitPrice = Number(item.unitPrice || 0);
        const taxPercent = Number(item.taxPercent || 0);
        return {
          medicineName: item.medicineName,
          dosage: item.dosage,
          frequency: item.frequency,
          duration: item.duration,
          instructions: item.instructions,
          quantity,
          serviceId: item.serviceId || undefined,
          unitPrice,
          taxPercent,
          amount: Math.round(quantity * unitPrice * 100) / 100,
        };
      }
    );

    const prescription = await Prescription.create({
      hospitalId: session.user.hospitalId,
      patientId: body.patientId,
      doctorId:
        session.user.role === "DOCTOR"
          ? session.user.id
          : body.doctorId || session.user.id,
      encounterId: body.encounterId,
      items,
      notes: body.notes,
      status: body.sign ? "signed" : "draft",
      signedAt: body.sign ? new Date() : undefined,
    });

    await writeAudit({
      hospitalId: session.user.hospitalId,
      actorId: session.user.id,
      actorEmail: session.user.email,
      action: body.sign ? "sign" : "create",
      resource: "prescription",
      resourceId: prescription._id.toString(),
    });

    if (body.sign) {
      await notify({
        hospitalId: session.user.hospitalId,
        title: "Prescription signed",
        message: `${session.user.name} signed a prescription`,
        type: "clinical",
        href: `/clinical/${body.encounterId}`,
        targetRoles: ["DOCTOR", "NURSE", "ACCOUNTANT"],
        actorId: session.user.id,
      });
    }

    return jsonOk(prescription, 201);
  } catch (error) {
    return jsonError(error);
  }
}
