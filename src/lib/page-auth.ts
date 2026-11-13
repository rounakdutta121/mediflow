import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { hasPermission, type Permission, type Role } from "@/lib/permissions";

export async function requirePagePermission(
  permission: Permission | Permission[]
) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const role = session.user.role as Role;
  const perms = Array.isArray(permission) ? permission : [permission];
  const allowed = perms.some((p) => hasPermission(role, p));
  if (!allowed) {
    redirect("/dashboard?error=forbidden");
  }

  return session;
}
