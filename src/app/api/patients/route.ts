import { Patient, getNextSequence } from "@/models";
import { jsonError, jsonOk, parsePagination, requireSession } from "@/lib/api";
import { writeAudit } from "@/lib/audit";
import { notify } from "@/lib/notifications";

export async function GET(req: Request) {
  try {
    const session = await requireSession("patients:read");
    const { searchParams } = new URL(req.url);
    const { page, limit, skip } = parsePagination(searchParams);
    const q = searchParams.get("q")?.trim();

    const status = searchParams.get("status") || "active";
    const filter: Record<string, unknown> = {
      hospitalId: session.user.hospitalId,
    };
    if (status === "active") filter.isActive = true;
    else if (status === "archived") filter.isActive = false;
    // status=all → no isActive filter

    if (q) {
      filter.$or = [
        { firstName: new RegExp(q, "i") },
        { lastName: new RegExp(q, "i") },
        { phone: new RegExp(q, "i") },
        { uhid: new RegExp(q, "i") },
        { email: new RegExp(q, "i") },
      ];
    }

    const [items, total] = await Promise.all([
      Patient.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Patient.countDocuments(filter),
    ]);

    return jsonOk({ items, total, page, limit });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireSession("patients:write");
    const body = await req.json();

    if (!body.firstName || !body.lastName || !body.phone) {
      return jsonError(new Error("firstName, lastName and phone are required"));
    }

    const seq = await getNextSequence(`uhid:${session.user.hospitalId}`);
    const uhid = `MFH-${String(seq).padStart(6, "0")}`;

    const patient = await Patient.create({
      hospitalId: session.user.hospitalId,
      uhid,
      firstName: body.firstName,
      lastName: body.lastName,
      phone: body.phone,
      email: body.email,
      dateOfBirth: body.dateOfBirth ? new Date(body.dateOfBirth) : undefined,
      gender: body.gender || "unknown",
      address: body.address,
      city: body.city,
      state: body.state,
      pincode: body.pincode,
      bloodGroup: body.bloodGroup,
      emergencyContactName: body.emergencyContactName,
      emergencyContactPhone: body.emergencyContactPhone,
      allergies: body.allergies || [],
      chronicConditions: body.chronicConditions || [],
      notes: body.notes,
      source: body.source || "walk-in",
    });

    await writeAudit({
      hospitalId: session.user.hospitalId,
      actorId: session.user.id,
      actorEmail: session.user.email,
      action: "create",
      resource: "patient",
      resourceId: patient._id.toString(),
      details: { uhid },
    });

    await notify({
      hospitalId: session.user.hospitalId,
      title: "New patient registered",
      message: `${patient.firstName} ${patient.lastName} (${uhid})`,
      type: "patient",
      href: `/patients/${patient._id}`,
      targetRoles: ["RECEPTIONIST", "DOCTOR"],
      actorId: session.user.id,
    });

    return jsonOk(patient, 201);
  } catch (error) {
    return jsonError(error);
  }
}
