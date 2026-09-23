import { expect, test, type Browser, type Page } from "@playwright/test";

// Dev/test OTP code (OTP_DEV_CODE in .env).
const DEV_CODE = process.env.OTP_DEV_CODE ?? "1234";

async function newPhone(browser: Browser): Promise<Page> {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  return ctx.newPage();
}

async function login(page: Page, email: string, password: string, home: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(`**${home}`);
  await expect(page.getByRole("status").filter({ hasText: "Live" })).toBeVisible();
}

test("student orders with an OTP, kitchen prepares it, student sees READY and the bill live", async ({ browser }) => {
  const student = await newPhone(browser);
  const kitchen = await newPhone(browser);

  // A fresh student each run: unique email and a random +91 mobile.
  const id = Date.now().toString(36);
  const phone = `9${String(Math.floor(Math.random() * 1e9)).padStart(9, "0")}`;
  await student.goto("/register");
  await student.getByLabel("Full name").fill("Test Student");
  await student.getByLabel("Email").fill(`e2e-${id}@canteen.test`);
  await student.getByLabel("Mobile number").fill(phone);
  await student.getByLabel("Password").fill("password123");
  await student.getByRole("button", { name: "Create account" }).click();
  await student.waitForURL("**/menu");
  await expect(student.getByRole("status").filter({ hasText: "Live" })).toBeVisible();

  await login(kitchen, "kitchen@canteen.test", "kitchen123", "/kitchen");

  // Build a cart and check out with the code.
  await student.getByRole("button", { name: "Add Idli (2 pcs)" }).click();
  await student.getByRole("button", { name: /View cart/ }).click();
  await student.getByRole("button", { name: "Place order" }).click();
  await expect(student.getByText("We sent a 4-digit code")).toBeVisible();
  await student.keyboard.type(DEV_CODE);
  await student.waitForURL("**/orders/**");
  const tokenText = await student.locator("p.text-7xl").innerText();
  const token = Number(tokenText.trim());
  expect(token).toBeGreaterThanOrEqual(101);

  // The kitchen sees it without a reload and moves it along.
  const card = kitchen.locator(`article[aria-label^="Token ${token},"]:visible`);
  await expect(card).toBeVisible();
  await card.getByRole("button", { name: "Start" }).click();
  await expect(student.locator('[aria-current="step"]')).toContainText("Preparing", { timeout: 2000 });

  await kitchen.getByRole("tab", { name: /Preparing/ }).click();
  await kitchen.locator(`article[aria-label^="Token ${token},"]:visible`).getByRole("button", { name: "Ready" }).click();
  await expect(student.getByText("Ready for pickup")).toBeVisible({ timeout: 2000 });

  // Collect by token; the bill appears on the student's phone live.
  await kitchen.getByLabel("Token number").fill(String(token));
  await kitchen.getByRole("button", { name: "Collect", exact: true }).click();
  await expect(student.getByRole("link", { name: /View bill/ })).toBeVisible({ timeout: 2000 });
  await student.getByRole("link", { name: /View bill/ }).click();
  await expect(student.getByText("Test Student")).toBeVisible();
  await expect(student.getByText(`+91 ${phone.slice(0, 5)} ${phone.slice(5)}`)).toBeVisible();
});

test("a student cannot open the kitchen", async ({ browser }) => {
  const page = await newPhone(browser);
  await login(page, "meena@canteen.test", "student123", "/menu");
  await page.goto("/kitchen");
  await page.waitForURL("**/menu");
  const res = await page.request.get("/api/orders?scope=board");
  expect(res.status()).toBe(403);
});
