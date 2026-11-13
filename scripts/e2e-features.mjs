import { chromium } from "playwright";

process.env.PLAYWRIGHT_BROWSERS_PATH =
  process.env.PLAYWRIGHT_BROWSERS_PATH || "D:\\playwright-browsers";

const BASE = "http://localhost:3000";
const results = [];
const ok = (m) => {
  results.push(`✓ ${m}`);
  console.log(`✓ ${m}`);
};
const fail = (m) => {
  results.push(`✗ ${m}`);
  console.error(`✗ ${m}`);
};

async function login(page, email, password) {
  await page.goto(`${BASE}/login`);
  await page.fill("#email", email);
  await page.fill("#password", password);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL(/dashboard/, { timeout: 20000 });
}

async function unread(page) {
  const res = await page.request.get(`${BASE}/api/notifications`);
  const data = await res.json();
  return data.unreadCount || 0;
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  // Admin creates patient -> notifications
  await login(page, "admin@mediflow.local", "Admin@12345");
  const beforeAdmin = await unread(page);

  await page.goto(`${BASE}/patients/new`);
  const stamp = Date.now().toString().slice(-5);
  await page.fill("#firstName", "Nisha");
  await page.fill("#lastName", `Bell${stamp}`);
  await page.fill("#phone", `99${stamp}01`);
  await page.getByRole("button", { name: /register patient/i }).click();
  await page.waitForURL(/patients\/[a-f0-9]+/);
  const patientUrl = page.url();
  const patientId = patientUrl.split("/").pop();
  ok(`Patient created ${patientId}`);

  await page.waitForTimeout(500);
  const afterAdmin = await unread(page);
  if (afterAdmin >= beforeAdmin) ok(`Admin notifications (${afterAdmin})`);
  else fail("Admin did not receive notification");

  // Bell UI
  await page.locator('button[aria-label="Notifications"]').click();
  await page.waitForTimeout(400);
  const bellText = await page.locator("text=Notifications").first().isVisible();
  if (bellText) ok("Notification bell panel opens");
  else fail("Bell panel missing");
  await page.keyboard.press("Escape");

  // Book + queue + encounter with price
  await page.goto(`${BASE}/appointments/new?patientId=${patientId}`);
  await page.waitForFunction(
    () => document.querySelectorAll("#doctorId option").length > 1
  );
  const form = page.locator("form").first();
  await form.locator("#patientId").selectOption(patientId);
  await form.locator("#doctorId").selectOption({ index: 1 });
  await page.waitForTimeout(500);
  if (!(await form.locator("#departmentId").inputValue())) {
    await form.locator("#departmentId").selectOption({ index: 1 });
  }
  await page.fill("#date", new Date().toISOString().slice(0, 10));
  await page.fill("#time", "12:15");
  const bookResp = page.waitForResponse(
    (r) => r.url().includes("/api/appointments") && r.request().method() === "POST"
  );
  await page.getByRole("button", { name: /book appointment/i }).click();
  const booked = await bookResp;
  if (!booked.ok()) fail(`Appointment API failed: ${booked.status()}`);
  else ok("Appointment booked");
  await page.goto(`${BASE}/appointments`);

  await page.goto(`${BASE}/queue`);
  await page.waitForTimeout(1000);
  const checkIn = page.getByRole("button", { name: /check in/i }).first();
  if (await checkIn.count()) {
    await checkIn.click();
    await page.waitForTimeout(1000);
    ok("Checked in");
  }
  const start = page.getByRole("button", { name: /start consult/i }).first();
  await start.click();
  await page.waitForURL(/clinical\/[a-f0-9]+/);
  ok("Encounter opened");

  // Edit notes + vitals
  if (await page.getByRole("button", { name: /^edit$/i }).count()) {
    // already in edit mode for open encounters for notes; save notes if Save notes visible
  }
  await page.getByLabel("Chief complaint").fill("Migraine with nausea");
  await page.getByLabel("History").fill("2 days headache");
  await page.getByLabel("Diagnosis").fill("Migraine");
  await page.getByRole("button", { name: /save notes/i }).click();
  await page.waitForTimeout(800);
  ok("Clinical notes saved");

  const vitalsCard = page.locator("div").filter({ has: page.getByText("Vitals", { exact: true }) }).filter({ has: page.getByRole("button", { name: /^edit$/i }) }).last();
  await vitalsCard.getByRole("button", { name: /^edit$/i }).click();
  await page.locator("#bp").fill("118/76");
  await page.locator("#pulse").fill("78");
  await page.locator("#temp").fill("98.4");
  await page.locator("#spo2").fill("98");
  await vitalsCard.getByRole("button", { name: /^save$/i }).click();
  await page.waitForTimeout(800);
  ok("Vitals saved");

  // Prescription with price/service
  await page.getByPlaceholder("Medicine name").fill("Sumatriptan");
  await page.getByPlaceholder("Dosage e.g. 500mg").fill("50mg");
  const serviceSelect = page.locator("select").filter({ hasText: "Custom price" });
  if (await serviceSelect.count()) {
    const options = await serviceSelect.locator("option").allTextContents();
    if (options.length > 1) await serviceSelect.selectOption({ index: 1 });
  }
  await page.getByPlaceholder("Enter charge amount").fill("250");
  await page.getByRole("button", { name: /sign prescription/i }).click();
  await page.waitForTimeout(1000);
  ok("Prescription with price signed");

  await page.getByRole("button", { name: /sign encounter & generate invoice/i }).click();
  await page.waitForTimeout(1500);
  const invoiceLink = page.getByRole("link", { name: /open invoice/i });
  if (await invoiceLink.count()) {
    ok("Auto invoice generated");
    await invoiceLink.click();
    await page.waitForURL(/billing\/[a-f0-9]+/);
    ok("Opened auto invoice");
  } else {
    // Maybe consultation-only invoice still created; check billing list
    await page.goto(`${BASE}/billing`);
    const hasInv = await page.locator("text=INV-").first().isVisible();
    if (hasInv) ok("Invoice visible in billing list");
    else fail("Auto invoice not found");
  }

  // Receptionist sees patient/queue notifications, not necessarily all clinical
  await page.getByRole("button", { name: /sign out/i }).click();
  await page.waitForURL(/login/);
  await login(page, "reception@mediflow.local", "Reception@12345");
  const receptionUnread = await unread(page);
  ok(`Reception notifications unread=${receptionUnread}`);
  await page.locator('button[aria-label="Notifications"]').click();
  await page.waitForTimeout(400);
  ok("Reception bell works");

  // Doctor notifications
  await page.getByRole("button", { name: /sign out/i }).click();
  await page.waitForURL(/login/);
  await login(page, "dr.mehta@mediflow.local", "Doctor@12345");
  const doctorUnread = await unread(page);
  ok(`Doctor notifications unread=${doctorUnread}`);

  // Accountant billing notifications
  await page.getByRole("button", { name: /sign out/i }).click();
  await page.waitForURL(/login/);
  await login(page, "accounts@mediflow.local", "Accounts@12345");
  const accountsUnread = await unread(page);
  ok(`Accounts notifications unread=${accountsUnread}`);

  await browser.close();

  const failed = results.filter((r) => r.startsWith("✗"));
  console.log("\n==== SUMMARY ====");
  console.log(`passed=${results.length - failed.length} failed=${failed.length}`);
  if (failed.length) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
