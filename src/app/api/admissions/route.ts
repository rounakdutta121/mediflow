import { Admission, Bed, Patient, getNextSequence } from "@/models";
import { ApiError, jsonError, jsonOk, parsePagination, requireSession } from "@/lib/api";
import { writeAudit } from "@/lib/audit";
import { notify } from "@/lib/notifications";

export async function GET(req: Request) {
  try {
    const session = await requireSession("admission:read");
    const { searchParams } = new URL(req.url);
    const { page, limit, skip } = parsePagination(searchParams);
    const status = searchParams.get("status") || "admitted";
    const patientId = searchParams.get("patientId");

    const filter: Record<string, unknown> = {
      hospitalId: session.user.hospitalId,
    };
    if (status !== "all") filter.status = status;
    if (patientId) filter.patientId = patientId;

    const [items, total] = await Promise.all([
      Admission.find(filter)
        .populate("patientId", "uhid firstName lastName phone gender")
        .populate("wardId", "name code floor")
        .populate("bedId", "bedNumber bedType status")
        .populate("admittingDoctorId", "name")
        .populate("departmentId", "name")
        .sort({ admittedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Admission.countDocuments(filter),
    ]);

    return jsonOk({
      items: items.map((a) => serializeAdmission(a)),
      total,
      page,
      limit,
    });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireSession("admission:write");
    const body = await req.json();

    if (!body.patientId || !body.bedId) {
      return jsonError(new Error("patientId and bedId are required"));
    }

    const patient = await Patient.findOne({
      _id: body.patientId,
      hospitalId: session.user.hospitalId,
      isActive: true,
    });
    if (!patient) throw new ApiError("Patient not found", 404);

    const existing = await Admission.findOne({
      hospitalId: session.user.hospitalId,
      patientId: body.patientId,
      status: "admitted",
    });
    if (existing) {
      throw new ApiError("Patient already has an active admission", 400);
    }

    const bed = await Bed.findOne({
      _id: body.bedId,
      hospitalId: session.user.hospitalId,
      isActive: true,
    });
    if (!bed) throw new ApiError("Bed not found", 404);
    if (bed.status !== "available") {
      throw new ApiError("Selected bed is not available", 400);
    }

    const seq = await getNextSequence(`admission:${session.user.hospitalId}`);
    const admissionNumber = `ADM-${String(seq).padStart(6, "0")}`;

    const admission = await Admission.create({
      hospitalId: session.user.hospitalId,
      admissionNumber,
      patientId: body.patientId,
      wardId: bed.wardId,
      bedId: bed._id,
      admittingDoctorId: body.admittingDoctorId || undefined,
      departmentId: body.departmentId || undefined,
      encounterId: body.encounterId || undefined,
      admissionType: body.admissionType || "elective",
      chiefComplaint: body.chiefComplaint,
      provisionalDiagnosis: body.provisionalDiagnosis,
      notes: body.notes,
      status: "admitted",
      admittedAt: body.admittedAt ? new Date(body.admittedAt) : new Date(),
      createdBy: session.user.id,
    });

    bed.status = "occupied";
    bed.currentAdmissionId = admission._id;
    await bed.save();

    await writeAudit({
      hospitalId: session.user.hospitalId,
      actorId: session.user.id,
      actorEmail: session.user.email,
      action: "create",
      resource: "admission",
      resourceId: admission._id.toString(),
      details: {
        admissionNumber,
        patientId: body.patientId,
        bedId: String(bed._id),
      },
    });

    await notify({
      hospitalId: session.user.hospitalId,
      title: "Patient admitted",
      message: `${patient.firstName} ${patient.lastName} · ${admissionNumber} · Bed ${bed.bedNumber}`,
      type: "clinical",
      href: `/admissions/${admission._id}`,
      targetRoles: ["RECEPTIONIST", "DOCTOR", "NURSE"],
      actorId: session.user.id,
    });

    return jsonOk(admission, 201);
  } catch (error) {
    return jsonError(error);
  }
}

function serializeAdmission(a: Record<string, unknown>) {
  const patient = a.patientId as
    | {
        _id?: { toString(): string };
        uhid?: string;
        firstName?: string;
        lastName?: string;
        phone?: string;
        gender?: string;
      }
    | string
    | null;
  const ward = a.wardId as
    | { _id?: { toString(): string }; name?: string; code?: string; floor?: string }
    | string
    | null;
  const bed = a.bedId as
    | {
        _id?: { toString(): string };
        bedNumber?: string;
        bedType?: string;
        status?: string;
      }
    | string
    | null;
  const doctor = a.admittingDoctorId as
    | { _id?: { toString(): string }; name?: string }
    | string
    | null;
  const dept = a.departmentId as
    | { _id?: { toString(): string }; name?: string }
    | string
    | null;

  return {
    _id: String(a._id),
    admissionNumber: a.admissionNumber,
    status: a.status,
    admissionType: a.admissionType,
    chiefComplaint: a.chiefComplaint,
    provisionalDiagnosis: a.provisionalDiagnosis,
    notes: a.notes,
    admittedAt: a.admittedAt
      ? new Date(a.admittedAt as string | Date).toISOString()
      : null,
    dischargedAt: a.dischargedAt
      ? new Date(a.dischargedAt as string | Date).toISOString()
      : null,
    dischargeSummary: a.dischargeSummary,
    patientId:
      patient && typeof patient === "object"
        ? {
            _id: patient._id ? String(patient._id) : undefined,
            uhid: patient.uhid || "",
            firstName: patient.firstName || "",
            lastName: patient.lastName || "",
            phone: patient.phone || "",
            gender: patient.gender || "",
          }
        : patient
          ? String(patient)
          : undefined,
    wardId:
      ward && typeof ward === "object"
        ? {
            _id: ward._id ? String(ward._id) : undefined,
            name: ward.name || "",
            code: ward.code || "",
            floor: ward.floor || "",
          }
        : ward
          ? String(ward)
          : undefined,
    bedId:
      bed && typeof bed === "object"
        ? {
            _id: bed._id ? String(bed._id) : undefined,
            bedNumber: bed.bedNumber || "",
            bedType: bed.bedType || "",
            status: bed.status || "",
          }
        : bed
          ? String(bed)
          : undefined,
    admittingDoctorId:
      doctor && typeof doctor === "object"
        ? { _id: doctor._id ? String(doctor._id) : undefined, name: doctor.name || "" }
        : doctor
          ? String(doctor)
          : undefined,
    departmentId:
      dept && typeof dept === "object"
        ? { _id: dept._id ? String(dept._id) : undefined, name: dept.name || "" }
        : dept
          ? String(dept)
          : undefined,
  };
}
