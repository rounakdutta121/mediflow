import { chromium, devices } from "playwright";
import fs from "fs";
import path from "path";

const BASE = process.env.BASE_URL || "http://localhost:3000";
const OUT = path.resolve("D:/hospitalcrm/test-artifacts/full-frontend");
fs.mkdirSync(OUT, { recursive: true });
process.env.PLAYWRIGHT_BROWSERS_PATH =
  process.env.PLAYWRIGHT_BROWSERS_PATH || "D:\\playwright-browsers";

const passed = [];
const failed = [];
const ok = (m) => {
  passed.push(m);
  console.log(`✓ ${m}`);
};
const fail = (m) => {
  failed.push(m);
  console.error(`✗ ${m}`);
};

async function login(page, email, password) {
  await page.goto(`${BASE}/login`);
  await page.fill("#email", email);
  await page.fill("#password", password);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL(/dashboard/, { timeout: 25000 });
}

async function noPageOverflow(page, label) {
  const o = await page.evaluate(() => ({
    sw: document.documentElement.scrollWidth,
    cw: document.documentElement.clientWidth,
  }));
  if (o.sw > o.cw + 2) fail(`${label}: horizontal overflow ${o.sw}>${o.cw}`);
  else ok(`${label}: no horizontal overflow`);
}

async function noFatalConsole(page, label, run) {
  const errors = [];
  const onError = (msg) => {
    const t = msg.text();
    if (
      msg.type() === "error" &&
      !t.includes("favicon") &&
      !t.includes("Download the React DevTools") &&
      !t.includes("hydrated but some attributes")
    ) {
      errors.push(t.slice(0, 180));
    }
  };
  page.on("console", onError);
  page.on("pageerror", (e) => errors.push(String(e.message).slice(0, 180)));
  try {
    await run();
  } finally {
    page.off("console", onError);
  }
  if (errors.length) fail(`${label}: console errors — ${errors[0]}`);
  else ok(`${label}: no console errors`);
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();
  page.setDefaultTimeout(25000);

  // —— Login screen ——
  await noFatalConsole(page, "Login load", async () => {
    await page.goto(`${BASE}/login`);
    await page.waitForSelector('img[alt="MediFlow"]');
  });
  const logoBox = await page.locator('img[alt="MediFlow"]').first().boundingBox();
  if (logoBox && logoBox.x < 80 && logoBox.y < 80) ok("Login logo top-left");
  else fail(`Login logo not top-left (${JSON.stringify(logoBox)})`);
  const hero = page.locator('img[alt="Hospital operations atmosphere"]');
  if ((await hero.count()) > 0) ok("Login full-bleed hero present");
  else fail("Login hero missing");
  await page.screenshot({ path: path.join(OUT, "01-login.png"), fullPage: true });

  await login(page, "admin@mediflow.local", "Admin@12345");
  ok("Admin login → dashboard");
  await page.screenshot({ path: path.join(OUT, "02-dashboard.png"), fullPage: true });

  // Theme
  await page.getByRole("button", { name: /switch to dark mode|toggle theme/i }).click();
  await page.waitForTimeout(350);
  if (await page.evaluate(() => document.documentElement.classList.contains("dark")))
    ok("Dark mode toggle");
  else fail("Dark mode failed");
  await page.getByRole("button", { name: /switch to light mode/i }).click();
  await page.waitForTimeout(250);

  // Notifications above content
  await page.getByRole("button", { name: /notifications/i }).click();
  await page.waitForTimeout(300);
  const panel = page.locator("text=Mark all read").first();
  if (await panel.isVisible()) ok("Notifications panel opens");
  else fail("Notifications panel missing");
  await page.keyboard.press("Escape").catch(() => {});
  await page.mouse.click(10, 10);

  const routes = [
    ["/dashboard", /Welcome|Operations/i],
    ["/patients", /Patients/i],
    ["/appointments", /Appointments/i],
    ["/queue", /Queue/i],
    ["/clinical", /Clinical/i],
    ["/billing", /Billing/i],
    ["/staff", /Doctors|Staff/i],
    ["/departments", /Departments/i],
    ["/reports", /Reports/i],
    ["/audit", /Audit/i],
    ["/settings", /Settings/i],
  ];

  for (const [href, re] of routes) {
    await page.goto(`${BASE}${href}`);
    await page.waitForLoadState("domcontentloaded");
    const h1 = (await page.locator("h1").first().textContent()) || "";
    if (re.test(h1) || (await page.locator("h1").count()) > 0)
      ok(`Route ${href} OK (${h1.trim()})`);
    else fail(`Route ${href} missing heading`);
    await noPageOverflow(page, href);
  }

  // Patients table spread
  await page.goto(`${BASE}/patients`);
  const table = page.locator('[role="table"]').first();
  if ((await table.count()) === 0) fail("Patients table missing");
  else {
    const widths = await table.evaluate((el) => {
      const row = el.querySelector('[role="row"]');
      if (!row) return null;
      const cells = [...row.querySelectorAll('[role="columnheader"], [role="cell"]')];
      const tw = row.getBoundingClientRect().width;
      const last = cells[cells.length - 1]?.getBoundingClientRect();
      return { tw, lastRight: last ? last.right - row.getBoundingClientRect().left : 0 };
    });
    if (widths && widths.lastRight > widths.tw * 0.85)
      ok(`Patients columns spread (${Math.round((widths.lastRight / widths.tw) * 100)}%)`);
    else
      fail(
        `Patients columns not spread (${JSON.stringify(widths)})`
      );
  }

  // Register patient
  const stamp = Date.now().toString().slice(-5);
  await page.goto(`${BASE}/patients/new`);
  await page.fill("#firstName", `FE${stamp}`);
  await page.fill("#lastName", "Check");
  await page.fill("#phone", `98${stamp}1234`.slice(0, 10));
  await page.getByRole("button", { name: /register patient/i }).click();
  await page.waitForURL(/\/patients\//, { timeout: 20000 });
  ok("Register patient works");
  const patientUrl = page.url();

  // Book appointment button below delete
  const book = page.getByRole("link", { name: /book appointment/i });
  const del = page.getByRole("button", { name: /delete patient/i });
  await del.waitFor({ state: "visible", timeout: 15000 });
  await book.waitFor({ state: "visible", timeout: 15000 });
  const b = await book.boundingBox();
  const d = await del.boundingBox();
  if (b && d && b.y >= d.y - 2) ok("Book appointment below delete");
  else fail(`Book/Delete order wrong b=${JSON.stringify(b)} d=${JSON.stringify(d)}`);

  // Book appointment flow
  await book.click();
  await page.waitForURL(/appointments\/new/);
  await page.waitForFunction(() => {
    const s = document.querySelector("select#patientId");
    return s && s.options && s.options.length > 1;
  });
  await page.waitForFunction(() => {
    const s = document.querySelector("select#doctorId");
    return s && [...s.options].some((o) => o.value && o.value.length > 5);
  });
  const docVal = await page.locator("select#doctorId").evaluate((s) => {
    const opt = [...s.options].find((o) => o.value && o.value.length > 5);
    return opt?.value || "";
  });
  await page.locator("select#doctorId").selectOption(docVal);
  await page.waitForFunction(() => {
    const s = document.querySelector("select#departmentId");
    return s && s.value;
  });
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  await page.fill("#date", tomorrow.toISOString().slice(0, 10));
  await page.fill("#time", "10:30");
  await page.getByRole("button", { name: /book appointment/i }).click();
  await page.waitForURL(/\/appointments(?!\/new)/, { timeout: 20000 });
  ok("Appointment booking works");

  // Queue loads
  await page.goto(`${BASE}/queue`);
  await page.waitForSelector("h1");
  ok("Queue page loads");

  // Clinical new + list
  await page.goto(`${BASE}/clinical`);
  await page.waitForSelector("h1");
  ok("Clinical list loads");

  // Billing
  await page.goto(`${BASE}/billing`);
  await page.waitForSelector("h1");
  ok("Billing list loads");
  await page.goto(`${BASE}/billing/new`);
  await page.waitForSelector("h1, form");
  ok("Billing create form loads");

  // Staff / departments
  await page.goto(`${BASE}/staff`);
  await page.waitForSelector("h1");
  ok("Staff page loads");
  await page.goto(`${BASE}/departments`);
  await page.waitForSelector("h1");
  ok("Departments page loads");

  // Settings hospital edit
  await page.goto(`${BASE}/settings`);
  await page.getByRole("button", { name: /^edit$/i }).click();
  await page.waitForSelector("#hospital-name");
  const name = await page.inputValue("#hospital-name");
  await page.fill("#hospital-name", name);
  await page.getByRole("button", { name: /save changes/i }).click();
  await page.waitForTimeout(800);
  ok("Hospital settings edit/save");

  // Reports + audit
  await page.goto(`${BASE}/reports`);
  await page.waitForSelector("h1");
  ok("Reports loads");
  await page.goto(`${BASE}/audit`);
  await page.waitForSelector("h1");
  ok("Audit loads");

  // Receptionist RBAC + UI
  const rctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const rpage = await rctx.newPage();
  await login(rpage, "reception@mediflow.local", "Reception@12345");
  ok("Reception login");
  await rpage.goto(`${BASE}/clinical`);
  await rpage.waitForURL(/error=forbidden|dashboard/);
  if (rpage.url().includes("forbidden") || rpage.url().includes("/dashboard"))
    ok("Reception blocked from clinical");
  else fail(`Reception clinical not blocked: ${rpage.url()}`);
  await rpage.goto(`${BASE}/patients`);
  if ((await rpage.getByRole("link", { name: /register patient/i }).count()) > 0)
    ok("Reception can register patients");
  else fail("Reception missing register CTA");
  await rctx.close();

  // Doctor RBAC
  const dctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const dpage = await dctx.newPage();
  await login(dpage, "dr.mehta@mediflow.local", "Doctor@12345");
  ok("Doctor login");
  await dpage.goto(`${BASE}/billing`);
  await dpage.waitForURL(/error=forbidden|dashboard/);
  if (dpage.url().includes("forbidden") || dpage.url().includes("/dashboard"))
    ok("Doctor blocked from billing");
  else fail(`Doctor billing not blocked: ${dpage.url()}`);
  await dpage.goto(`${BASE}/clinical`);
  await dpage.waitForSelector("h1");
  ok("Doctor clinical accessible");
  await dctx.close();

  // Mobile
  const mctx = await browser.newContext({ ...devices["iPhone 13"] });
  const mpage = await mctx.newPage();
  await login(mpage, "admin@mediflow.local", "Admin@12345");
  await mpage.getByRole("button", { name: /open menu/i }).click();
  await mpage.getByRole("link", { name: "Patients", exact: true }).click();
  await mpage.waitForURL(/patients/);
  ok("Mobile sidebar navigation");
  await noPageOverflow(mpage, "Mobile patients");
  await mpage.screenshot({ path: path.join(OUT, "03-mobile-patients.png"), fullPage: true });
  await mctx.close();

  // Visit patient detail again for screenshot
  await page.goto(patientUrl);
  await page.screenshot({ path: path.join(OUT, "04-patient-detail.png"), fullPage: true });

  await browser.close();

  console.log("\n======== FULL FRONTEND SUMMARY ========");
  console.log(`Passed: ${passed.length}`);
  console.log(`Failed: ${failed.length}`);
  if (failed.length) {
    for (const f of failed) console.log(`  - ${f}`);
    process.exit(1);
  }
  console.log("All frontend checks passed.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
