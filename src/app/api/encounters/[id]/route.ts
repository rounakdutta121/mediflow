import { Encounter, Appointment, Prescription } from "@/models";
import { ApiError, jsonError, jsonOk, requireSession } from "@/lib/api";
import { writeAudit } from "@/lib/audit";
import { notify } from "@/lib/notifications";
import { createInvoiceFromEncounter } from "@/lib/auto-invoice";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSession("clinical:read");
    const { id } = await params;
    const encounter = await Encounter.findOne({
      _id: id,
      hospitalId: session.user.hospitalId,
    })
      .populate("patientId", "uhid firstName lastName phone allergies")
      .populate("doctorId", "name specialization")
      .lean();
    if (!encounter) throw new ApiError("Encounter not found", 404);

    const prescriptions = await Prescription.find({ encounterId: id }).lean();
    return jsonOk({ ...encounter, prescriptions });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSession("clinical:write");
    const { id } = await params;
    const body = await req.json();

    const encounter = await Encounter.findOne({
      _id: id,
      hospitalId: session.user.hospitalId,
    });
    if (!encounter) throw new ApiError("Encounter not found", 404);

    // Allow editing notes/vitals even after sign — mark as amended
    const editingContent =
      body.chiefComplaint !== undefined ||
      body.history !== undefined ||
      body.examination !== undefined ||
      body.assessment !== undefined ||
      body.plan !== undefined ||
      body.vitals !== undefined ||
      body.diagnoses !== undefined;

    if (body.chiefComplaint !== undefined) encounter.chiefComplaint = body.chiefComplaint;
    if (body.history !== undefined) encounter.history = body.history;
    if (body.examination !== undefined) encounter.examination = body.examination;
    if (body.assessment !== undefined) encounter.assessment = body.assessment;
    if (body.plan !== undefined) encounter.plan = body.plan;
    if (body.vitals !== undefined) encounter.vitals = body.vitals;
    if (body.diagnoses !== undefined) encounter.diagnoses = body.diagnoses;

    let invoice = null;

    if (body.status === "signed") {
      encounter.status = "signed";
      encounter.signedAt = new Date();
      if (encounter.appointmentId) {
        await Appointment.findByIdAndUpdate(encounter.appointmentId, {
          status: "completed",
        });
      }

      invoice = await createInvoiceFromEncounter({
        hospitalId: session.user.hospitalId,
        patientId: encounter.patientId,
        encounterId: encounter._id,
        appointmentId: encounter.appointmentId,
        createdBy: session.user.id,
      });

      await notify({
        hospitalId: session.user.hospitalId,
        title: "Encounter signed",
        message: `Clinical encounter signed by ${session.user.name}`,
        type: "clinical",
        href: `/clinical/${id}`,
        targetRoles: ["DOCTOR", "NURSE", "RECEPTIONIST"],
        actorId: session.user.id,
      });

      if (invoice) {
        await notify({
          hospitalId: session.user.hospitalId,
          title: "Invoice auto-generated",
          message: `${invoice.invoiceNumber} created from signed encounter (₹${invoice.total})`,
          type: "billing",
          href: `/billing/${invoice._id}`,
          targetRoles: ["ACCOUNTANT", "RECEPTIONIST"],
          actorId: session.user.id,
        });
      }
    } else if (encounter.status === "signed" && editingContent) {
      encounter.status = "amended";
    } else if (body.status === "amended") {
      encounter.status = "amended";
    }

    await encounter.save();

    await writeAudit({
      hospitalId: session.user.hospitalId,
      actorId: session.user.id,
      actorEmail: session.user.email,
      action: body.status === "signed" ? "sign" : "update",
      resource: "encounter",
      resourceId: id,
      details: invoice
        ? { invoiceId: invoice._id.toString(), invoiceNumber: invoice.invoiceNumber }
        : undefined,
    });

    return jsonOk({ encounter, invoice });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSession("clinical:write");
    const { id } = await params;

    const encounter = await Encounter.findOneAndDelete({
      _id: id,
      hospitalId: session.user.hospitalId,
    });
    if (!encounter) throw new ApiError("Encounter not found", 404);

    await Prescription.deleteMany({ encounterId: id });

    await writeAudit({
      hospitalId: session.user.hospitalId,
      actorId: session.user.id,
      actorEmail: session.user.email,
      action: "delete",
      resource: "encounter",
      resourceId: id,
    });

    await notify({
      hospitalId: session.user.hospitalId,
      title: "Encounter deleted",
      message: `${session.user.name} deleted an encounter`,
      type: "clinical",
      href: "/clinical",
      targetRoles: ["DOCTOR"],
      actorId: session.user.id,
    });

    return jsonOk({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
