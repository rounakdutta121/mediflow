import { Admission, Bed } from "@/models";
import { ApiError, jsonError, jsonOk, requireSession } from "@/lib/api";
import { writeAudit } from "@/lib/audit";
import { notify } from "@/lib/notifications";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSession("admission:read");
    const { id } = await params;

    const admission = await Admission.findOne({
      _id: id,
      hospitalId: session.user.hospitalId,
    })
      .populate("patientId", "uhid firstName lastName phone gender address")
      .populate("wardId", "name code floor")
      .populate("bedId", "bedNumber bedType status")
      .populate("admittingDoctorId", "name")
      .populate("departmentId", "name")
      .lean();

    if (!admission) throw new ApiError("Admission not found", 404);
    return jsonOk(serialize(admission));
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSession("admission:write");
    const { id } = await params;
    const body = await req.json();

    const admission = await Admission.findOne({
      _id: id,
      hospitalId: session.user.hospitalId,
    }).populate("patientId", "firstName lastName uhid");

    if (!admission) throw new ApiError("Admission not found", 404);

    const action = body.action as string | undefined;

    if (action === "discharge") {
      if (admission.status !== "admitted") {
        throw new ApiError("Only active admissions can be discharged", 400);
      }

      admission.status = "discharged";
      admission.dischargedAt = new Date();
      admission.dischargeSummary = body.dischargeSummary || admission.dischargeSummary;
      await admission.save();

      await Bed.updateOne(
        { _id: admission.bedId, hospitalId: session.user.hospitalId },
        {
          $set: { status: "available" },
          $unset: { currentAdmissionId: 1 },
        }
      );

      const patient = admission.patientId as unknown as {
        firstName?: string;
        lastName?: string;
        uhid?: string;
      };

      await writeAudit({
        hospitalId: session.user.hospitalId,
        actorId: session.user.id,
        actorEmail: session.user.email,
        action: "discharge",
        resource: "admission",
        resourceId: id,
        details: { admissionNumber: admission.admissionNumber },
      });

      await notify({
        hospitalId: session.user.hospitalId,
        title: "Patient discharged",
        message: `${patient?.firstName || ""} ${patient?.lastName || ""} · ${admission.admissionNumber}`,
        type: "clinical",
        href: `/admissions/${id}`,
        targetRoles: ["RECEPTIONIST", "DOCTOR", "NURSE", "ACCOUNTANT"],
        actorId: session.user.id,
      });

      return jsonOk(admission);
    }

    if (action === "transfer") {
      if (admission.status !== "admitted") {
        throw new ApiError("Only active admissions can be transferred", 400);
      }
      if (!body.bedId) throw new ApiError("bedId is required for transfer", 400);

      const newBed = await Bed.findOne({
        _id: body.bedId,
        hospitalId: session.user.hospitalId,
        isActive: true,
      });
      if (!newBed) throw new ApiError("Target bed not found", 404);
      if (newBed.status !== "available") {
        throw new ApiError("Target bed is not available", 400);
      }
      if (String(newBed._id) === String(admission.bedId)) {
        throw new ApiError("Patient is already on this bed", 400);
      }

      const oldBedId = admission.bedId;

      await Bed.updateOne(
        { _id: oldBedId, hospitalId: session.user.hospitalId },
        {
          $set: { status: "available" },
          $unset: { currentAdmissionId: 1 },
        }
      );

      newBed.status = "occupied";
      newBed.currentAdmissionId = admission._id;
      await newBed.save();

      admission.bedId = newBed._id;
      admission.wardId = newBed.wardId;
      if (body.notes) {
        admission.notes = [admission.notes, body.notes].filter(Boolean).join("\n");
      }
      await admission.save();

      await writeAudit({
        hospitalId: session.user.hospitalId,
        actorId: session.user.id,
        actorEmail: session.user.email,
        action: "transfer",
        resource: "admission",
        resourceId: id,
        details: {
          fromBedId: String(oldBedId),
          toBedId: String(newBed._id),
        },
      });

      return jsonOk(admission);
    }

    if (body.chiefComplaint !== undefined) {
      admission.chiefComplaint = body.chiefComplaint;
    }
    if (body.provisionalDiagnosis !== undefined) {
      admission.provisionalDiagnosis = body.provisionalDiagnosis;
    }
    if (body.notes !== undefined) admission.notes = body.notes;
    if (body.admittingDoctorId !== undefined) {
      admission.admittingDoctorId = body.admittingDoctorId || undefined;
    }
    if (body.departmentId !== undefined) {
      admission.departmentId = body.departmentId || undefined;
    }

    await admission.save();

    await writeAudit({
      hospitalId: session.user.hospitalId,
      actorId: session.user.id,
      actorEmail: session.user.email,
      action: "update",
      resource: "admission",
      resourceId: id,
    });

    return jsonOk(admission);
  } catch (error) {
    return jsonError(error);
  }
}

function serialize(a: Record<string, unknown>) {
  const pick = (
    value: unknown,
    fields: string[]
  ): Record<string, string> | string | undefined => {
    if (!value) return undefined;
    if (typeof value !== "object") return String(value);
    const obj = value as Record<string, unknown>;
    const out: Record<string, string> = {};
    if (obj._id) out._id = String(obj._id);
    for (const f of fields) {
      if (obj[f] != null) out[f] = String(obj[f]);
    }
    return out;
  };

  return {
    _id: String(a._id),
    admissionNumber: a.admissionNumber,
    status: a.status,
    admissionType: a.admissionType,
    chiefComplaint: a.chiefComplaint || "",
    provisionalDiagnosis: a.provisionalDiagnosis || "",
    notes: a.notes || "",
    dischargeSummary: a.dischargeSummary || "",
    admittedAt: a.admittedAt
      ? new Date(a.admittedAt as Date).toISOString()
      : null,
    dischargedAt: a.dischargedAt
      ? new Date(a.dischargedAt as Date).toISOString()
      : null,
    patientId: pick(a.patientId, [
      "uhid",
      "firstName",
      "lastName",
      "phone",
      "gender",
      "address",
    ]),
    wardId: pick(a.wardId, ["name", "code", "floor"]),
    bedId: pick(a.bedId, ["bedNumber", "bedType", "status"]),
    admittingDoctorId: pick(a.admittingDoctorId, ["name"]),
    departmentId: pick(a.departmentId, ["name"]),
  };
}
