/**
 * Smoke: beds:manage RBAC + hospital records visibility.
 * Requires: npm run dev + seeded users (incl. nurse).
 */
const BASE = process.env.BASE_URL || "http://localhost:3000";

const passed = [];
const failed = [];
function ok(m) {
  passed.push(m);
  console.log(`✓ ${m}`);
}
function fail(m) {
  failed.push(m);
  console.error(`✗ ${m}`);
}
function assert(cond, m) {
  if (cond) ok(m);
  else fail(m);
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
  const cookie = () =>
    [...jar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");

  const csrfRes = await fetch(`${BASE}/api/auth/csrf`, {
    headers: { cookie: cookie() },
  });
  store(csrfRes);
  const { csrfToken } = await csrfRes.json();
  const loginRes = await fetch(`${BASE}/api/auth/callback/credentials`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      cookie: cookie(),
    },
    body: new URLSearchParams({
      csrfToken,
      email,
      password,
      callbackUrl: `${BASE}/dashboard`,
      json: "true",
    }),
    redirect: "manual",
  });
  store(loginRes);
  if (loginRes.status !== 200 && loginRes.status !== 302) {
    throw new Error(`login ${email} → ${loginRes.status}`);
  }
  return {
    async api(method, path, body) {
      return fetch(`${BASE}${path}`, {
        method,
        headers: {
          cookie: cookie(),
          ...(body ? { "Content-Type": "application/json" } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
        redirect: "manual",
      });
    },
    async page(path) {
      return fetch(`${BASE}${path}`, {
        headers: { cookie: cookie() },
        redirect: "manual",
      });
    },
  };
}

async function main() {
  console.log(`Beds + records smoke @ ${BASE}\n`);

  const admin = await login("admin@mediflow.local", "Admin@12345");
  const nurse = await login("nurse@mediflow.local", "Nurse@12345");
  const reception = await login("reception@mediflow.local", "Reception@12345");
  const doctor = await login("dr.mehta@mediflow.local", "Doctor@12345");
  const accounts = await login("accounts@mediflow.local", "Accounts@12345");

  // —— Beds manage page ——
  assert((await admin.page("/admissions/beds")).status === 200, "admin → /admissions/beds");
  assert((await nurse.page("/admissions/beds")).status === 200, "nurse → /admissions/beds");
  // reception/doctor/accounts should not have beds:manage (soft-nav ok; API is hard)
  const recBedsPost = await reception.api("POST", "/api/beds", {
    wardId: "000000000000000000000001",
    bedNumber: "DENY1",
  });
  assert(recBedsPost.status === 403, "reception POST /api/beds → 403");
  const docBedsPost = await doctor.api("POST", "/api/beds", {
    wardId: "000000000000000000000001",
    bedNumber: "DENY2",
  });
  assert(docBedsPost.status === 403, "doctor POST /api/beds → 403");
  const accBedsPost = await accounts.api("POST", "/api/beds", {
    wardId: "000000000000000000000001",
    bedNumber: "DENY3",
  });
  assert(accBedsPost.status === 403, "accountant POST /api/beds → 403");

  // —— Admin creates ward + bed, nurse can edit ——
  const code = `SMK${Date.now().toString(36).slice(-4).toUpperCase()}`;
  const wardRes = await admin.api("POST", "/api/wards", {
    name: `Smoke Ward ${code}`,
    code,
    floor: "T",
  });
  assert(wardRes.status === 200 || wardRes.status === 201, `admin create ward (${wardRes.status})`);
  const wardJson = await wardRes.json().catch(() => ({}));
  const wardId = wardJson.item?._id || wardJson._id || wardJson.ward?._id;

  let bedId;
  if (wardId) {
    const bedRes = await nurse.api("POST", "/api/beds", {
      wardId,
      bedNumber: `B-${code}`,
      bedType: "general",
    });
    assert(bedRes.status === 200 || bedRes.status === 201, `nurse create bed (${bedRes.status})`);
    const bedJson = await bedRes.json().catch(() => ({}));
    bedId = bedJson.item?._id || bedJson._id;

    if (bedId) {
      const patch = await nurse.api("PATCH", `/api/beds/${bedId}`, {
        bedType: "semi_private",
        notes: "smoke edit",
      });
      assert(patch.status === 200, `nurse edit bed (${patch.status})`);

      const delDenied = await reception.api("DELETE", `/api/beds/${bedId}`);
      assert(delDenied.status === 403, "reception cannot delete bed");

      const delOk = await admin.api("DELETE", `/api/beds/${bedId}`);
      assert(delOk.status === 200, `admin delete bed (${delOk.status})`);
    } else {
      fail("no bedId from nurse create");
    }

    await admin.api("DELETE", `/api/wards/${wardId}`);
  } else {
    fail("no wardId from admin create");
  }

  // Reception can still admit (admission:write) and read beds
  const bedsGet = await reception.api("GET", "/api/beds");
  assert(bedsGet.status === 200, "reception GET /api/beds allowed");
  const wardsPost = await reception.api("POST", "/api/wards", {
    name: "Should Fail",
    code: "FAILX",
  });
  assert(wardsPost.status === 403, "reception POST /api/wards → 403");

  // —— Records hub ——
  for (const [name, client] of [
    ["admin", admin],
    ["nurse", nurse],
    ["reception", reception],
    ["doctor", doctor],
    ["accounts", accounts],
  ]) {
    const res = await client.page("/records");
    assert(res.status === 200, `${name} → /records (${res.status})`);
  }

  // Accountant cannot open admissions pages/APIs
  const accAdm = await accounts.api("GET", "/api/admissions");
  assert(accAdm.status === 403, "accountant GET /api/admissions → 403");
  const accAdmPage = await accounts.page("/admissions");
  // soft-nav may be 200; if hard redirect check
  const loc = accAdmPage.headers.get("location") || "";
  if (accAdmPage.status === 307 || accAdmPage.status === 302) {
    assert(loc.includes("forbidden"), "accountant /admissions redirected forbidden");
  } else {
    ok("accountant /admissions soft-nav (API 403 enforced)");
  }

  // Billing filters + invoices history
  const inv = await accounts.api("GET", "/api/invoices?status=partially_paid&limit=10");
  assert(inv.status === 200, "accountant can list partially_paid invoices");
  const invAll = await admin.api("GET", "/api/invoices?limit=5");
  assert(invAll.status === 200, "admin list invoices");

  // Appointment history
  const hist = await reception.api("GET", "/api/appointments?view=history&limit=10");
  assert(hist.status === 200, "reception appointments history");

  // Patients archived filter
  const arch = await admin.api("GET", "/api/patients?status=all&limit=5");
  assert(arch.status === 200, "admin patients status=all");

  console.log(`\n======== SUMMARY ========`);
  console.log(`Passed: ${passed.length}`);
  console.log(`Failed: ${failed.length}`);
  if (failed.length) {
    for (const f of failed) console.log(`  - ${f}`);
    process.exit(1);
  }
  console.log("Beds + records smoke passed.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
