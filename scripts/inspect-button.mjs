import { chromium } from "playwright";

process.env.PLAYWRIGHT_BROWSERS_PATH =
  process.env.PLAYWRIGHT_BROWSERS_PATH || "D:\\playwright-browsers";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.goto("http://localhost:3000/login");
await page.fill("#email", "admin@mediflow.local");
await page.fill("#password", "Admin@12345");
await page.getByRole("button", { name: /sign in/i }).click();
await page.waitForURL(/dashboard/);
await page.goto("http://localhost:3000/patients");
const info = await page
  .locator('a:has-text("Register patient")')
  .first()
  .evaluate((e) => {
    const s = getComputedStyle(e);
    return {
      className: e.className,
      color: s.color,
      backgroundColor: s.backgroundColor,
      hasTextWhite: e.classList.contains("text-white"),
      stylesheetHits: [...document.styleSheets]
        .flatMap((ss) => {
          try {
            return [...ss.cssRules];
          } catch {
            return [];
          }
        })
        .filter((r) => r.cssText && r.cssText.includes("text-white") || (r.selectorText || "").includes(".text-white"))
        .slice(0, 5)
        .map((r) => r.cssText),
    };
  });
console.log(JSON.stringify(info, null, 2));
await browser.close();
