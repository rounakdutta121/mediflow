import { chromium, devices } from "playwright";
import fs from "fs";
import path from "path";

const BASE = process.env.BASE_URL || "http://localhost:3000";
const OUT = path.resolve("D:/hospitalcrm/test-artifacts/ui-redesign");
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

async function assertNoHorizontalBleed(page, label) {
  const overflow = await page.evaluate(() => {
    const doc = document.documentElement;
    return {
      scrollWidth: doc.scrollWidth,
      clientWidth: doc.clientWidth,
    };
  });
  if (overflow.scrollWidth > overflow.clientWidth + 2) {
    fail(
      `${label}: page horizontal overflow ${overflow.scrollWidth} > ${overflow.clientWidth}`
    );
  } else {
    ok(`${label}: no horizontal page overflow`);
  }
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();
  page.setDefaultTimeout(20000);

  // Login + brand
  await page.goto(`${BASE}/login`);
  await page.waitForSelector('img[alt="MediFlow"]');
  ok("Login shows MediFlow logo");
  await page.screenshot({ path: path.join(OUT, "login-desktop.png"), fullPage: true });

  await login(page, "admin@mediflow.local", "Admin@12345");
  ok("Admin login");
  await page.screenshot({ path: path.join(OUT, "dashboard-light.png"), fullPage: true });

  // Theme toggle
  const themeBtn = page.getByRole("button", { name: /switch to dark mode|toggle theme/i });
  await themeBtn.click();
  await page.waitForTimeout(400);
  const isDark = await page.evaluate(() =>
    document.documentElement.classList.contains("dark")
  );
  if (isDark) ok("Dark theme applied");
  else fail("Dark theme class missing after toggle");
  await page.screenshot({ path: path.join(OUT, "dashboard-dark.png"), fullPage: true });

  await page.getByRole("button", { name: /switch to light mode/i }).click();
  await page.waitForTimeout(300);

  const routes = [
    ["/patients", "Patients"],
    ["/appointments", "Appointments"],
    ["/queue", "Queue"],
    ["/clinical", "Clinical"],
    ["/billing", "Billing"],
    ["/staff", "Staff"],
    ["/departments", "Departments"],
    ["/reports", "Reports"],
    ["/audit", "Audit"],
    ["/settings", "Settings"],
  ];

  for (const [href, label] of routes) {
    await page.goto(`${BASE}${href}`);
    await page.waitForLoadState("networkidle").catch(() => {});
    const title = await page.locator("h1").first().textContent();
    if (!title) fail(`${label}: missing h1`);
    else ok(`${label}: rendered (${title.trim()})`);
    await assertNoHorizontalBleed(page, label);
    await page.screenshot({
      path: path.join(OUT, `${label.toLowerCase().replace(/\\s+/g, "-")}.png`),
      fullPage: true,
    });
  }

  // Patients virtualized table shell present
  await page.goto(`${BASE}/patients`);
  const table = page.locator('[role="table"]');
  if ((await table.count()) > 0) ok("Patients DataTable present");
  else fail("Patients DataTable missing");

  // Mobile
  const mobile = await browser.newContext({
    ...devices["iPhone 13"],
  });
  const mpage = await mobile.newPage();
  await login(mpage, "admin@mediflow.local", "Admin@12345");
  await mpage.getByRole("button", { name: /open menu/i }).click();
  await mpage.getByRole("link", { name: "Patients", exact: true }).click();
  await mpage.waitForURL(/patients/);
  ok("Mobile nav opens Patients");
  await assertNoHorizontalBleed(mpage, "Mobile patients");
  await mpage.screenshot({
    path: path.join(OUT, "patients-mobile.png"),
    fullPage: true,
  });

  // Receptionist still blocked from clinical (RBAC intact)
  const rctx = await browser.newContext();
  const rpage = await rctx.newPage();
  await login(rpage, "reception@mediflow.local", "Reception@12345");
  await rpage.goto(`${BASE}/clinical`);
  await rpage.waitForURL(/dashboard\\?error=forbidden|dashboard\\?error%3Dforbidden|error=forbidden/);
  ok("Receptionist clinical still forbidden after redesign");

  await browser.close();

  console.log(`\\n======== UI REDESIGN SUMMARY ========`);
  console.log(`Passed: ${passed.length}`);
  console.log(`Failed: ${failed.length}`);
  if (failed.length) {
    for (const f of failed) console.log(`  - ${f}`);
    process.exit(1);
  }
  console.log("UI redesign checks passed.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
