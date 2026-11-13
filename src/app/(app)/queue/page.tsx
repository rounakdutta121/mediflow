import { requirePagePermission } from "@/lib/page-auth";
import { hasPermission, type Role } from "@/lib/permissions";
import { QueueClient } from "./queue-client";

export default async function QueuePage() {
  const session = await requirePagePermission("queue:manage");
  const canStartConsult = hasPermission(
    session.user.role as Role,
    "clinical:write"
  );

  return <QueueClient canStartConsult={canStartConsult} />;
}
