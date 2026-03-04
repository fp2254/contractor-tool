import { test, expect } from "@playwright/test";

const email = process.env.E2E_EMAIL;
const password = process.env.E2E_PASSWORD;

test("login and create customer, quote, invoice", async ({ page }) => {
  test.skip(!email || !password, "Set E2E_EMAIL and E2E_PASSWORD to run this smoke test");

  await page.goto("/auth/login");
  await page.getByPlaceholder("Email").fill(email!);
  await page.getByPlaceholder("Password").fill(password!);
  await page.getByRole("button", { name: "Log In" }).click();

  await expect(page).toHaveURL(/\/app$/);

  await page.goto("/app/customers");
  const customerName = `ACME ${Date.now()}`;
  await page.getByPlaceholder("First name").fill(customerName);
  await page.getByRole("button", { name: "Create Customer" }).click();
  await expect(page.getByText(customerName)).toBeVisible();

  await page.goto("/app/quotes/new");
  await page.locator('input[placeholder="Item"]').nth(0).fill("Labor");
  await page.locator('input[placeholder="Qty"]').nth(0).fill("2");
  await page.locator('input[placeholder="Unit price"]').nth(0).fill("50");
  await page.locator('input[placeholder="Item"]').nth(1).fill("Materials");
  await page.locator('input[placeholder="Qty"]').nth(1).fill("1");
  await page.locator('input[placeholder="Unit price"]').nth(1).fill("75");
  await page.getByRole("button", { name: "Save Quote" }).click();

  await expect(page.getByRole("button", { name: "Convert to Invoice" })).toBeVisible();
  await page.getByRole("button", { name: "Convert to Invoice" }).click();

  await expect(page).toHaveURL(/\/app\/invoices\//);
  await expect(page.getByText("Invoice #")).toBeVisible();
});
