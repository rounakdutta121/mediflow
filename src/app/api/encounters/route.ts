import { Encounter, Appointment } from "@/models";
import { jsonError, jsonOk, parsePagination, requireSession } from "@/lib/api";
import { writeAudit } from "@/lib/audit";

export async function GET(req: Request) {
  try {
    const session = await requireSession("clinical:read");
    const { searchParams } = new URL(req.url);
    const { page, limit, skip } = parsePagination(searchParams);
    const patientId = searchParams.get("patientId");

    const filter: Record<string, unknown> = {
      hospitalId: session.user.hospitalId,
    };
    if (patientId) filter.patientId = patientId;
    if (session.user.role === "DOCTOR") {
      filter.doctorId = session.user.id;
    }

    const [items, total] = await Promise.all([
      Encounter.find(filter)
        .populate("patientId", "uhid firstName lastName")
        .populate("doctorId", "name")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Encounter.countDocuments(filter),
    ]);

    return jsonOk({ items, total, page, limit });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireSession("clinical:write");
    const body = await req.json();

    if (!body.patientId) {
      return jsonError(new Error("patientId is required"));
    }

    const doctorId =
      session.user.role === "DOCTOR" ? session.user.id : body.doctorId || session.user.id;

    const encounter = await Encounter.create({
      hospitalId: session.user.hospitalId,
      patientId: body.patientId,
      doctorId,
      appointmentId: body.appointmentId,
      departmentId: body.departmentId,
      chiefComplaint: body.chiefComplaint,
      history: body.history,
      examination: body.examination,
      assessment: body.assessment,
      plan: body.plan,
      vitals: body.vitals,
      diagnoses: body.diagnoses || [],
      status: "open",
    });

    if (body.appointmentId) {
      await Appointment.findByIdAndUpdate(body.appointmentId, {
        status: "in_consultation",
      });
    }

    await writeAudit({
      hospitalId: session.user.hospitalId,
      actorId: session.user.id,
      actorEmail: session.user.email,
      action: "create",
      resource: "encounter",
      resourceId: encounter._id.toString(),
    });

    return jsonOk(encounter, 201);
  } catch (error) {
    return jsonError(error);
  }
}
