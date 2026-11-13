import { chromium } from "playwright";

process.env.PLAYWRIGHT_BROWSERS_PATH =
  process.env.PLAYWRIGHT_BROWSERS_PATH || "D:\\playwright-browsers";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.goto("http://localhost:3000/login");
const vars = await page.evaluate(() => {
  const s = getComputedStyle(document.documentElement);
  return {
    colorWhite: s.getPropertyValue("--color-white"),
    colorForeground: s.getPropertyValue("--color-foreground"),
    foreground: s.getPropertyValue("--foreground"),
    colorSlate900: s.getPropertyValue("--color-slate-900"),
  };
});
console.log(vars);

await page.fill("#email", "admin@mediflow.local");
await page.fill("#password", "Admin@12345");
await page.getByRole("button", { name: /sign in/i }).click();
await page.waitForURL(/dashboard/);

const btn = await page.locator('button:has-text("Sign out")').evaluate((e) => {
  const s = getComputedStyle(e);
  return {
    color: s.color,
    bg: s.backgroundColor,
    colorWhiteVar: getComputedStyle(document.documentElement).getPropertyValue("--color-white"),
  };
});
console.log("signout", btn);

const loginBtn = await page.goto("http://localhost:3000/login").then(async () => {
  return page.locator('button[type="submit"]').evaluate((e) => {
    const s = getComputedStyle(e);
    return { color: s.color, bg: s.backgroundColor, className: e.className };
  });
});
console.log("loginBtn", loginBtn);

await browser.close();
