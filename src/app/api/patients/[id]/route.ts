import { Patient } from "@/models";
import { ApiError, jsonError, jsonOk, requireSession } from "@/lib/api";
import { writeAudit } from "@/lib/audit";
import { notify } from "@/lib/notifications";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSession("patients:read");
    const { id } = await params;
    const patient = await Patient.findOne({
      _id: id,
      hospitalId: session.user.hospitalId,
    }).lean();
    if (!patient) throw new ApiError("Patient not found", 404);
    return jsonOk(patient);
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSession("patients:write");
    const { id } = await params;
    const body = await req.json();

    const patient = await Patient.findOneAndUpdate(
      { _id: id, hospitalId: session.user.hospitalId },
      {
        $set: {
          firstName: body.firstName,
          lastName: body.lastName,
          phone: body.phone,
          email: body.email,
          dateOfBirth: body.dateOfBirth ? new Date(body.dateOfBirth) : undefined,
          gender: body.gender,
          address: body.address,
          city: body.city,
          state: body.state,
          pincode: body.pincode,
          bloodGroup: body.bloodGroup,
          emergencyContactName: body.emergencyContactName,
          emergencyContactPhone: body.emergencyContactPhone,
          allergies: body.allergies,
          chronicConditions: body.chronicConditions,
          notes: body.notes,
          source: body.source,
        },
      },
      { new: true }
    );

    if (!patient) throw new ApiError("Patient not found", 404);

    await writeAudit({
      hospitalId: session.user.hospitalId,
      actorId: session.user.id,
      actorEmail: session.user.email,
      action: "update",
      resource: "patient",
      resourceId: id,
    });

    return jsonOk(patient);
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSession("patients:write");
    const { id } = await params;

    const patient = await Patient.findOneAndUpdate(
      { _id: id, hospitalId: session.user.hospitalId },
      { $set: { isActive: false } },
      { new: true }
    );
    if (!patient) throw new ApiError("Patient not found", 404);

    await writeAudit({
      hospitalId: session.user.hospitalId,
      actorId: session.user.id,
      actorEmail: session.user.email,
      action: "delete",
      resource: "patient",
      resourceId: id,
    });

    await notify({
      hospitalId: session.user.hospitalId,
      title: "Patient deactivated",
      message: `${patient.firstName} ${patient.lastName} (${patient.uhid})`,
      type: "patient",
      href: "/patients",
      targetRoles: ["RECEPTIONIST"],
      actorId: session.user.id,
    });

    return jsonOk({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
