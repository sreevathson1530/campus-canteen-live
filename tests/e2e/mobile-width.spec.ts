import { expect, test, type Page } from "@playwright/test";

// No page may be wider than a small phone: a too-wide page scrolls sideways and hides buttons.
test.use({ viewport: { width: 360, height: 780 } });

async function login(page: Page, email: string, password: string, home: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(`**${home}`);
}

async function expectFits(page: Page, path: string) {
  await page.goto(path);
  await page.waitForLoadState("networkidle");
  const { scrollWidth, clientWidth } = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth }));
  expect(scrollWidth, `${path} is ${scrollWidth}px wide on a ${clientWidth}px screen`).toBeLessThanOrEqual(clientWidth + 1);
}

test("public and customer pages fit a 360px phone", async ({ page }) => {
  for (const path of ["/", "/login", "/register", "/credits"]) await expectFits(page, path);
  await login(page, "asha@canteen.test", "student123", "/menu");
  for (const path of ["/menu", "/orders"]) await expectFits(page, path);
});

test("kitchen and admin pages fit a 360px phone", async ({ page }) => {
  await login(page, "admin@canteen.cit", "admin123", "/admin");
  for (const path of ["/admin", "/admin/orders", "/kitchen", "/kitchen/stock", "/admin/menu", "/admin/bills", "/admin/users", "/admin/settings"]) {
    await expectFits(page, path);
  }
});
