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
    const rules = [];
    for (const sheet of document.styleSheets) {
      let cssRules;
      try {
        cssRules = [...sheet.cssRules];
      } catch {
        continue;
      }
      for (const rule of cssRules) {
        const collect = (r, parent = "") => {
          if (r.type === CSSRule.STYLE_RULE) {
            try {
              if (e.matches(r.selectorText)) {
                if (r.style.color) {
                  rules.push({
                    selector: r.selectorText,
                    color: r.style.color,
                    cssText: r.cssText.slice(0, 200),
                    parent,
                  });
                }
              }
            } catch {
              /* invalid selector for matches */
            }
          } else if (r.cssRules) {
            for (const child of r.cssRules) {
              collect(child, r.cssText.slice(0, 40));
            }
          }
        };
        collect(rule);
      }
    }
    return {
      computed: getComputedStyle(e).color,
      matchingColorRules: rules,
    };
  });

console.log(JSON.stringify(info, null, 2));
await browser.close();
