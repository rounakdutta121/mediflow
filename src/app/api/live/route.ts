import { jsonError, jsonOk, requireSession } from "@/lib/api";
import { getLiveSnapshot } from "@/lib/live";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await requireSession();
    const snapshot = await getLiveSnapshot(session.user.hospitalId);
    return jsonOk(snapshot, 200, {
      "Cache-Control": "no-store, max-age=0",
    });
  } catch (error) {
    return jsonError(error);
  }
}
