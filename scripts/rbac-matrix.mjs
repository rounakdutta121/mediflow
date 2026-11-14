/**
 * Live RBAC matrix: login as each seeded role, hit every page + API action,
 * assert allow → not 403 / deny → 403 (pages → redirect to dashboard?error=forbidden).
 */
const BASE = process.env.BASE_URL || "http://localhost:3000";

const ALL_PERMS = [
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
];

const ROLE_PERMISSIONS = {
  HOSPITAL_ADMIN: [...ALL_PERMS],
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

function hasPermission(role, permission) {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

const USERS = [
  {
    role: "HOSPITAL_ADMIN",
    email: "admin@mediflow.local",
    password: "Admin@12345",
  },
  {
    role: "RECEPTIONIST",
    email: "reception@mediflow.local",
    password: "Reception@12345",
  },
  {
    role: "DOCTOR",
    email: "dr.mehta@mediflow.local",
    password: "Doctor@12345",
  },
  {
    role: "ACCOUNTANT",
    email: "accounts@mediflow.local",
    password: "Accounts@12345",
  },
];

/** Page path → required permission */
const PAGES = [
  ["/dashboard", "dashboard:view"],
  ["/patients", "patients:read"],
  ["/patients/new", "patients:write"],
  ["/appointments", "appointments:read"],
  ["/appointments/new", "appointments:write"],
  ["/queue", "queue:manage"],
  ["/clinical", "clinical:read"],
  ["/clinical/new", "clinical:write"],
  ["/billing", "billing:read"],
  ["/billing/new", "billing:write"],
  ["/admissions", "admission:read"],
  ["/admissions/new", "admission:write"],
  ["/staff", "staff:read"],
  ["/departments", "departments:read"],
  ["/reports", "reports:view"],
  ["/audit", "audit:view"],
  ["/settings", "settings:manage"],
];

/** API checks: [method, path, permission | permission[] | null (auth only)] */
const APIS = [
  ["GET", "/api/dashboard", "dashboard:view"],
  ["GET", "/api/patients", "patients:read"],
  ["POST", "/api/patients", "patients:write"],
  ["GET", "/api/appointments", "appointments:read"],
  ["POST", "/api/appointments", "appointments:write"],
  ["GET", "/api/queue", "queue:manage"],
  ["POST", "/api/queue/check-in", "queue:manage"],
  ["GET", "/api/encounters", "clinical:read"],
  ["POST", "/api/encounters", "clinical:write"],
  ["POST", "/api/prescriptions", "clinical:write"],
  ["GET", "/api/invoices", "billing:read"],
  ["POST", "/api/invoices", "billing:write"],
  ["POST", "/api/payments", "billing:write"],
  ["GET", "/api/wards", "admission:read"],
  ["POST", "/api/wards", "admission:write"],
  ["GET", "/api/beds", "admission:read"],
  ["POST", "/api/beds", "admission:write"],
  ["GET", "/api/admissions", "admission:read"],
  ["POST", "/api/admissions", "admission:write"],
  ["PATCH", "/api/admissions/000000000000000000000001", "admission:write"],
  ["GET", "/api/services", ["billing:read", "clinical:read"]],
  ["POST", "/api/services", "billing:write"],
  ["GET", "/api/staff", "staff:read"],
  ["POST", "/api/staff", "staff:write"],
  ["GET", "/api/departments", "departments:read"],
  ["POST", "/api/departments", "departments:write"],
  ["GET", "/api/schedules", ["staff:read", "appointments:read"]],
  ["POST", "/api/schedules", "staff:write"],
  ["GET", "/api/reports/summary", "reports:view"],
  ["GET", "/api/audit", "audit:view"],
  ["GET", "/api/notifications", null],
  // mutations (fake ids → 404 when allowed, 403 when denied)
  ["PATCH", "/api/patients/000000000000000000000001", "patients:write"],
  ["DELETE", "/api/patients/000000000000000000000001", "patients:write"],
  ["PATCH", "/api/appointments/000000000000000000000001", "appointments:write"],
  ["DELETE", "/api/appointments/000000000000000000000001", "appointments:write"],
  ["PATCH", "/api/encounters/000000000000000000000001", "clinical:write"],
  ["DELETE", "/api/encounters/000000000000000000000001", "clinical:write"],
  ["DELETE", "/api/prescriptions/000000000000000000000001", "clinical:write"],
  ["DELETE", "/api/invoices/000000000000000000000001", "billing:write"],
  ["PATCH", "/api/staff/000000000000000000000001", "staff:write"],
  ["DELETE", "/api/staff/000000000000000000000001", "staff:write"],
  ["PATCH", "/api/departments/000000000000000000000001", "departments:write"],
  ["DELETE", "/api/departments/000000000000000000000001", "departments:write"],
];

const passed = [];
const failed = [];

function ok(msg) {
  passed.push(msg);
  console.log(`✓ ${msg}`);
}
function fail(msg) {
  failed.push(msg);
  console.error(`✗ ${msg}`);
}

function roleAllowed(role, permission) {
  if (permission == null) return true;
  if (Array.isArray(permission)) {
    return permission.some((p) => hasPermission(role, p));
  }
  return hasPermission(role, permission);
}

async function login(email, password) {
  const jar = new Map();
  const store = (res) => {
    const raw = res.headers.getSetCookie?.() || [];
    for (const c of raw) {
      const [pair] = c.split(";");
      const eq = pair.indexOf("=");
      if (eq > 0) jar.set(pair.slice(0, eq), pair.slice(eq + 1));
    }
  };
  const cookieHeader = () =>
    [...jar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");

  const csrfRes = await fetch(`${BASE}/api/auth/csrf`, {
    headers: { cookie: cookieHeader() },
  });
  store(csrfRes);
  const { csrfToken } = await csrfRes.json();

  const body = new URLSearchParams({
    csrfToken,
    email,
    password,
    callbackUrl: `${BASE}/dashboard`,
    json: "true",
  });

  const loginRes = await fetch(`${BASE}/api/auth/callback/credentials`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      cookie: cookieHeader(),
    },
    body,
    redirect: "manual",
  });
  store(loginRes);

  if (loginRes.status !== 200 && loginRes.status !== 302) {
    throw new Error(`Login failed for ${email}: ${loginRes.status}`);
  }

  return {
    cookie: cookieHeader(),
    async request(method, path, jsonBody) {
      const res = await fetch(`${BASE}${path}`, {
        method,
        headers: {
          cookie: cookieHeader(),
          ...(jsonBody ? { "Content-Type": "application/json" } : {}),
        },
        body: jsonBody ? JSON.stringify(jsonBody) : undefined,
        redirect: "manual",
      });
      return res;
    },
  };
}

async function main() {
  console.log(`RBAC matrix against ${BASE}\n`);

  // Static matrix sanity (all roles including NURSE/AUDITOR)
  for (const [role, perms] of Object.entries(ROLE_PERMISSIONS)) {
    if (!Array.isArray(perms) || perms.length === 0) {
      fail(`${role}: empty permissions`);
    } else {
      ok(`${role}: ${perms.length} permissions defined`);
    }
  }

  for (const user of USERS) {
    console.log(`\n—— ${user.role} (${user.email}) ——`);
    let client;
    try {
      client = await login(user.email, user.password);
      ok(`${user.role}: login`);
    } catch (e) {
      fail(`${user.role}: login — ${e.message}`);
      continue;
    }

    for (const [path, permission] of PAGES) {
      const expectAllow = roleAllowed(user.role, permission);
      const res = await client.request("GET", path);
      // Next.js redirect → 307/302 to /dashboard?error=forbidden
      const loc = res.headers.get("location") || "";
      const denied =
        (res.status === 307 || res.status === 302) &&
        loc.includes("error=forbidden");
      const allowed =
        res.status === 200 ||
        (res.status >= 300 && res.status < 400 && !denied);

      if (expectAllow && allowed) {
        ok(`${user.role} PAGE ${path} allowed (${res.status})`);
      } else if (!expectAllow && denied) {
        ok(`${user.role} PAGE ${path} denied`);
      } else if (expectAllow && !allowed) {
        fail(
          `${user.role} PAGE ${path} expected allow, got ${res.status} loc=${loc}`
        );
      } else {
        fail(
          `${user.role} PAGE ${path} expected deny, got ${res.status} loc=${loc}`
        );
      }
    }

    for (const [method, path, permission] of APIS) {
      const expectAllow = roleAllowed(user.role, permission);
      const dummyBodies = {
        "POST /api/patients": {
          firstName: "RBAC",
          lastName: "Test",
          phone: "9000000000",
        },
        "POST /api/appointments": {},
        "POST /api/queue/check-in": {},
        "POST /api/encounters": {},
        "POST /api/prescriptions": {},
        "POST /api/invoices": {},
        "POST /api/payments": {},
        "POST /api/services": { code: "X", name: "X", price: 1 },
        "POST /api/staff": {},
        "POST /api/departments": { name: "RBAC Temp" },
        "POST /api/schedules": {},
      };
      const key = `${method} ${path}`;
      const res = await client.request(
        method,
        path,
        method === "POST" ? dummyBodies[key] || {} : undefined
      );

      const isForbidden = res.status === 403;
      if (expectAllow && !isForbidden) {
        ok(`${user.role} API ${method} ${path} not-forbidden (${res.status})`);
      } else if (!expectAllow && isForbidden) {
        ok(`${user.role} API ${method} ${path} 403`);
      } else if (expectAllow && isForbidden) {
        fail(`${user.role} API ${method} ${path} unexpectedly 403`);
      } else {
        fail(
          `${user.role} API ${method} ${path} expected 403, got ${res.status}`
        );
      }
    }
  }

  console.log(`\n======== SUMMARY ========`);
  console.log(`Passed: ${passed.length}`);
  console.log(`Failed: ${failed.length}`);
  if (failed.length) {
    console.log("\nFailures:");
    for (const f of failed) console.log(`  - ${f}`);
    process.exit(1);
  }
  console.log("All RBAC checks passed.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
