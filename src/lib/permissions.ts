export const ROLES = [
  "HOSPITAL_ADMIN",
  "RECEPTIONIST",
  "DOCTOR",
  "NURSE",
  "ACCOUNTANT",
  "AUDITOR",
] as const;

export type Role = (typeof ROLES)[number];

export const PERMISSIONS = [
  "dashboard:view",
  "patients:read",
  "patients:write",
  "appointments:read",
  "appointments:write",
  "queue:manage",
  "staff:read",
  "staff:write",
  "departments:read",
  "departments:write",
  "clinical:read",
  "clinical:write",
  "billing:read",
  "billing:write",
  "admission:read",
  "admission:write",
  "reports:view",
  "audit:view",
  "settings:manage",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  HOSPITAL_ADMIN: [...PERMISSIONS],
  RECEPTIONIST: [
    "dashboard:view",
    "patients:read",
    "patients:write",
    "appointments:read",
    "appointments:write",
    "queue:manage",
    "staff:read",
    "departments:read",
    "billing:read",
    "billing:write",
    "admission:read",
    "admission:write",
  ],
  DOCTOR: [
    "dashboard:view",
    "patients:read",
    "appointments:read",
    "queue:manage",
    "staff:read",
    "departments:read",
    "clinical:read",
    "clinical:write",
    "admission:read",
    "admission:write",
  ],
  NURSE: [
    "dashboard:view",
    "patients:read",
    "appointments:read",
    "queue:manage",
    "clinical:read",
    "admission:read",
    "admission:write",
  ],
  ACCOUNTANT: [
    "dashboard:view",
    "patients:read",
    "billing:read",
    "billing:write",
    "admission:read",
    "reports:view",
  ],
  AUDITOR: [
    "dashboard:view",
    "patients:read",
    "appointments:read",
    "clinical:read",
    "billing:read",
    "admission:read",
    "reports:view",
    "audit:view",
  ],
};

export function hasPermission(role: Role, permission: Permission) {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function hasAnyPermission(role: Role, permissions: Permission[]) {
  return permissions.some((p) => hasPermission(role, p));
}
