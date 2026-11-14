/**
 * Smoke test: login → list beds → admit patient → transfer → discharge.
 */
const BASE = process.env.BASE_URL || "http://localhost:3000";

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
  if (!jar.has("authjs.session-token") && ![...jar.keys()].some((k) => k.includes("session-token"))) {
    throw new Error(`Login failed for ${email}`);
  }
  return {
    cookie: cookieHeader(),
    fetch: (path, init = {}) =>
      fetch(`${BASE}${path}`, {
        ...init,
        headers: {
          ...(init.headers || {}),
          cookie: cookieHeader(),
        },
      }),
  };
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
  console.log(`✓ ${msg}`);
}

async function main() {
  const session = await login("admin@mediflow.local", "Admin@12345");
  console.log("Logged in as admin");

  const page = await session.fetch("/admissions");
  assert(page.status === 200, `GET /admissions → ${page.status}`);

  const wards = await session.fetch("/api/wards").then((r) => r.json());
  assert(Array.isArray(wards.items) && wards.items.length > 0, "wards loaded");

  const beds = await session
    .fetch("/api/beds?status=available")
    .then((r) => r.json());
  assert(Array.isArray(beds.items) && beds.items.length > 0, "available beds");

  const patients = await session
    .fetch("/api/patients?limit=5")
    .then((r) => r.json());
  assert(patients.items?.length > 0, "patients available");

  // Prefer a patient without active admission
  let patientId = null;
  for (const p of patients.items) {
    const active = await session
      .fetch(`/api/admissions?patientId=${p._id}&status=admitted`)
      .then((r) => r.json());
    if (!active.items?.length) {
      patientId = p._id;
      break;
    }
  }
  if (!patientId) {
    const created = await session
      .fetch("/api/patients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: "Admit",
          lastName: "Smoke",
          phone: "9000000099",
          gender: "male",
        }),
      })
      .then((r) => r.json());
    patientId = created._id;
    assert(patientId, "created smoke patient");
  }

  const bedId = beds.items[0]._id;
  const admitRes = await session.fetch("/api/admissions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      patientId,
      bedId,
      admissionType: "elective",
      chiefComplaint: "Smoke test admission",
    }),
  });
  const admission = await admitRes.json();
  assert(admitRes.status === 201, `admit → ${admitRes.status} ${admission.error || ""}`);
  assert(admission.admissionNumber, `admission ${admission.admissionNumber}`);

  const detailPage = await session.fetch(`/admissions/${admission._id}`);
  assert(detailPage.status === 200, `GET /admissions/${admission._id}`);

  const beds2 = await session
    .fetch("/api/beds?status=available")
    .then((r) => r.json());
  const other = (beds2.items || []).find((b) => b._id !== bedId);
  if (other) {
    const transfer = await session.fetch(`/api/admissions/${admission._id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "transfer", bedId: other._id }),
    });
    assert(transfer.status === 200, `transfer → ${transfer.status}`);
  } else {
    console.log("~ skipped transfer (no second free bed)");
  }

  const discharge = await session.fetch(`/api/admissions/${admission._id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "discharge",
      dischargeSummary: "Smoke test discharge",
    }),
  });
  assert(discharge.status === 200, `discharge → ${discharge.status}`);

  // Forbidden check: accountant cannot write
  const accounts = await login("accounts@mediflow.local", "Accounts@12345");
  const denied = await accounts.fetch("/api/admissions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ patientId, bedId }),
  });
  assert(denied.status === 403, `accountant POST admissions → 403`);

  const nurse = await login("nurse@mediflow.local", "Nurse@12345");
  const nursePage = await nurse.fetch("/admissions");
  assert(nursePage.status === 200, "nurse can open admissions");

  console.log("\nAdmission smoke tests passed.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
