import { expect, test } from "@playwright/test";

test("main navigation renders core sections", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Дашборд" })).toBeVisible();

  await page.getByRole("link", { name: "Вакансии" }).click();
  await expect(page.getByRole("heading", { name: "Вакансии" })).toBeVisible();

  await page.getByRole("link", { name: "Оркестратор" }).click();
  await expect(
    page.getByRole("heading", { name: "Оркестратор" }),
  ).toBeVisible();
});
