import { Prescription } from "@/models";
import { ApiError, jsonError, jsonOk, requireSession } from "@/lib/api";
import { writeAudit } from "@/lib/audit";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSession("clinical:write");
    const { id } = await params;

    const rx = await Prescription.findOneAndDelete({
      _id: id,
      hospitalId: session.user.hospitalId,
    });
    if (!rx) throw new ApiError("Prescription not found", 404);

    await writeAudit({
      hospitalId: session.user.hospitalId,
      actorId: session.user.id,
      actorEmail: session.user.email,
      action: "delete",
      resource: "prescription",
      resourceId: id,
    });

    return jsonOk({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
