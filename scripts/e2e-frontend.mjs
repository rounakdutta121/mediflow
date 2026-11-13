import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const BASE = process.env.BASE_URL || "http://localhost:3000";
const OUT = path.resolve("D:/hospitalcrm/test-artifacts");
fs.mkdirSync(OUT, { recursive: true });

const issues = [];
const passed = [];

function ok(msg) {
  passed.push(msg);
  console.log(`✓ ${msg}`);
}
function fail(msg) {
  issues.push(msg);
  console.error(`✗ ${msg}`);
}

function ignoreConsole(text) {
  return (
    text.includes("hydrated but some attributes") ||
    text.includes("caret-color") ||
    text.includes("Download the React DevTools")
  );
}

async function contrastCheck(page, selector, label) {
  const el = page.locator(selector).first();
  if ((await el.count()) === 0) {
    fail(`${label}: element not found (${selector})`);
    return null;
  }
  const result = await el.evaluate((node) => {
    const parse = (c) => {
      const value = String(c);
      const m = value.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
      if (m) return [Number(m[1]), Number(m[2]), Number(m[3])];
      const lab = value.match(/lab\(\s*([0-9.]+)/i);
      if (lab) {
        // Approximate sRGB from CIELAB L using neutral a/b=0
        const L = Number(lab[1]);
        const y = (L + 16) / 116;
        const Y = y ** 3 > 0.008856 ? y ** 3 : (y - 16 / 116) / 7.787;
        const g = Math.min(255, Math.max(0, Math.round(Y * 255)));
        return [g, g, g];
      }
      return null;
    };
    const lum = ([r, g, b]) => {
      const f = (v) => {
        v /= 255;
        return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
      };
      return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
    };
    const styles = getComputedStyle(node);
    let bgEl = node;
    let bg = styles.backgroundColor;
    while (
      bgEl &&
      (bg === "transparent" || bg === "rgba(0, 0, 0, 0)")
    ) {
      bgEl = bgEl.parentElement;
      if (!bgEl) break;
      bg = getComputedStyle(bgEl).backgroundColor;
    }
    const fg = parse(styles.color);
    const bgRgb = parse(bg);
    if (!fg || !bgRgb) {
      return {
        ok: false,
        reason: `unparsed fg=${styles.color} bg=${bg}`,
      };
    }
    const L1 = lum(fg);
    const L2 = lum(bgRgb);
    const ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
    return {
      ok: ratio >= 3,
      ratio: Number(ratio.toFixed(2)),
      color: styles.color,
      backgroundColor: bg,
      text: (node.textContent || "").trim().slice(0, 40),
    };
  });

  if (!result.ok) {
    fail(
      `${label}: poor contrast ratio ${result.ratio || "?"} (${result.color || result.reason} on ${result.backgroundColor || ""}) text="${result.text || ""}"`
    );
  } else {
    ok(`${label}: contrast ${result.ratio}:1`);
  }
  return result;
}

async function shot(page, name) {
  await page.screenshot({
    path: path.join(OUT, `${name}.png`),
    fullPage: true,
  });
}

async function login(page, email, password) {
  await page.goto(`${BASE}/login`);
  await page.fill("#email", email);
  await page.fill("#password", password);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL(/dashboard/, { timeout: 20000 });
}

async function nav(page, name) {
  await page.locator("aside").getByRole("link", { name, exact: true }).click();
}

async function main() {
  process.env.PLAYWRIGHT_BROWSERS_PATH =
    process.env.PLAYWRIGHT_BROWSERS_PATH || "D:\\playwright-browsers";

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    colorScheme: "light",
  });
  const page = await context.newPage();
  page.setDefaultTimeout(20000);

  page.on("pageerror", (err) => fail(`Page error: ${err.message}`));
  page.on("console", (msg) => {
    if (msg.type() === "error" && !ignoreConsole(msg.text())) {
      fail(`Console error: ${msg.text()}`);
    }
  });

  // 1. Login
  await page.goto(`${BASE}/login`);
  await page.waitForTimeout(500);
  await shot(page, "01-login");
  await contrastCheck(page, 'button[type="submit"]', "Login Sign in button");
  ok("Login page loaded");

  // 2. Admin dashboard
  await login(page, "admin@mediflow.local", "Admin@12345");
  await page.waitForTimeout(500);
  await shot(page, "02-dashboard");
  await contrastCheck(page, "header button:has-text('Sign out')", "Topbar Sign out");
  ok("Admin dashboard reachable");

  // 3. Patients
  await nav(page, "Patients");
  await page.waitForURL(/patients/);
  await shot(page, "03-patients");
  await contrastCheck(
    page,
    'a:has-text("Register patient")',
    "Register patient CTA"
  );

  await page.getByRole("link", { name: /register patient/i }).click();
  await page.waitForURL(/patients\/new/);
  const stamp = Date.now().toString().slice(-6);
  await page.fill("#firstName", "Ravi");
  await page.fill("#lastName", `Test${stamp}`);
  await page.fill("#phone", `98${stamp}12`);
  await page.fill("#email", `ravi${stamp}@test.local`);
  await page.selectOption("#gender", "male");
  await page.fill("#city", "Mumbai");
  await page.fill("#allergies", "Penicillin");
  await shot(page, "04-patient-form");
  await page.getByRole("button", { name: /register patient/i }).click();
  await page.waitForURL(/patients\/[a-f0-9]+/, { timeout: 20000 });
  await shot(page, "05-patient-detail");
  ok(`Patient registered (${await page.locator("h1").first().textContent()})`);
  await contrastCheck(
    page,
    'a:has-text("Book appointment")',
    "Book appointment CTA"
  );
  await contrastCheck(
    page,
    'a:has-text("Start encounter")',
    "Start encounter CTA"
  );

  // 4. Appointment
  await page.getByRole("link", { name: /book appointment/i }).click();
  await page.waitForURL(/appointments\/new/);
  await page.waitForTimeout(1000);
  await page.locator("#patientId").selectOption({ index: 1 });
  await page.locator("#doctorId").selectOption({ index: 1 });
  await page.waitForTimeout(300);
  await page.fill("#date", new Date().toISOString().slice(0, 10));
  await page.fill("#time", "11:30");
  await page.fill("#reason", "E2E fever check");
  await shot(page, "06-appointment-form");
  await page.getByRole("button", { name: /book appointment/i }).click();
  await page.waitForURL(/appointments$/, { timeout: 20000 });
  await shot(page, "07-appointments");
  ok("Appointment booked");

  // 5. Queue
  await nav(page, "Queue");
  await page.waitForURL(/queue/);
  await page.waitForTimeout(1200);
  await shot(page, "08-queue");
  const checkIn = page.getByRole("button", { name: /check in/i }).first();
  if (await checkIn.count()) {
    await contrastCheck(page, 'button:has-text("Check in")', "Check in button");
    await checkIn.click();
    await page.waitForTimeout(1500);
    await shot(page, "09-queue-checked-in");
    ok("Check-in succeeded");
  } else {
    fail("No Check in button visible on queue");
  }

  const startConsult = page.getByRole("button", { name: /start consult/i }).first();
  if (await startConsult.count()) {
    await contrastCheck(
      page,
      'button:has-text("Start consult")',
      "Start consult button"
    );
    await startConsult.click();
    await page.waitForURL(/clinical\/[a-f0-9]+/, { timeout: 20000 });
    await shot(page, "10-encounter");
    ok("Encounter started from queue");

    await page.fill('input[placeholder="Medicine name"]', "Paracetamol");
    await page.fill('input[placeholder^="Dosage"]', "500mg");
    await page.fill('input[placeholder^="Frequency"]', "1-0-1");
    await page.fill('input[placeholder^="Duration"]', "3 days");
    await page.getByRole("button", { name: /sign prescription/i }).click();
    await page.waitForTimeout(1200);
    await page.getByRole("button", { name: /sign encounter/i }).click();
    await page.waitForTimeout(1200);
    await shot(page, "11-encounter-signed");
    ok("Prescription and encounter signed");
  } else {
    await nav(page, "Clinical / EMR");
    await page.getByRole("link", { name: /new encounter/i }).click();
    await page.waitForTimeout(1000);
    await page.locator('select[name="patientId"]').selectOption({ index: 1 });
    await page.fill('input[name="chiefComplaint"]', "E2E headache");
    await page.fill('input[name="diagnosis"]', "Tension headache");
    await page.getByRole("button", { name: /create encounter/i }).click();
    await page.waitForURL(/clinical\/[a-f0-9]+/, { timeout: 20000 });
    ok("Encounter created manually");
  }

  // 6. Billing
  await nav(page, "Billing");
  await page.waitForURL(/billing/);
  await page.getByRole("link", { name: /create invoice/i }).click();
  await page.waitForURL(/billing\/new/);
  await page.waitForTimeout(1000);
  await page.locator('select[name="patientId"]').selectOption({ index: 1 });
  await page.getByRole("button", { name: /add item/i }).click();
  await shot(page, "12-invoice-form");
  await page.getByRole("button", { name: /create invoice/i }).click();
  await page.waitForURL(/billing\/[a-f0-9]+/, { timeout: 20000 });
  await shot(page, "13-invoice-detail");
  ok("Invoice created");

  if (await page.getByRole("button", { name: /record payment/i }).count()) {
    await contrastCheck(
      page,
      'button:has-text("Record payment")',
      "Record payment button"
    );
    await page.getByRole("button", { name: /record payment/i }).click();
    await page.waitForTimeout(1500);
    await shot(page, "14-payment-recorded");
    ok("Payment recorded");
  } else {
    fail("Record payment button missing");
  }

  // 7. Other modules
  const routes = [
    ["Doctors & Staff", /staff/],
    ["Departments", /departments/],
    ["Reports", /reports/],
    ["Audit", /audit/],
    ["Settings", /settings/],
  ];
  let i = 15;
  for (const [label, re] of routes) {
    await nav(page, label);
    await page.waitForURL(re, { timeout: 15000 });
    await shot(page, `${i}-${label.toLowerCase().replace(/[^a-z]+/g, "-")}`);
    ok(`Visited ${label}`);
    i += 1;
  }

  await page.locator("aside").getByRole("link", { name: "Laboratory" }).click();
  await page.waitForURL(/coming-soon\/laboratory/);
  await shot(page, "20-coming-soon");
  ok("Coming soon shell works");

  // 8. Receptionist RBAC
  await page.getByRole("button", { name: /sign out/i }).click();
  await page.waitForURL(/login/);
  await login(page, "reception@mediflow.local", "Reception@12345");
  await shot(page, "21-reception-dashboard");
  if ((await page.locator("aside").getByRole("link", { name: "Audit" }).count()) === 0) {
    ok("Receptionist cannot see Audit (RBAC)");
  } else {
    fail("Receptionist should not see Audit");
  }

  // 9. Doctor RBAC
  await page.getByRole("button", { name: /sign out/i }).click();
  await page.waitForURL(/login/);
  await login(page, "dr.mehta@mediflow.local", "Doctor@12345");
  await shot(page, "22-doctor-dashboard");
  if ((await page.locator("aside").getByRole("link", { name: "Billing" }).count()) === 0) {
    ok("Doctor cannot see Billing (RBAC)");
  } else {
    fail("Doctor should not see Billing");
  }
  await nav(page, "Queue");
  await page.waitForURL(/queue/);
  ok("Doctor queue accessible");

  await browser.close();

  const summary = {
    passed: passed.length,
    failed: issues.length,
    issues,
    artifacts: OUT,
  };
  fs.writeFileSync(path.join(OUT, "summary.json"), JSON.stringify(summary, null, 2));
  console.log("\n==== SUMMARY ====");
  console.log(JSON.stringify(summary, null, 2));
  if (issues.length) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
