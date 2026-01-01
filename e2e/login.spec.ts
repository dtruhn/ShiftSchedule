import { expect, test } from "./fixtures";
import { attachStepScreenshot } from "./utils/screenshots";

test("login screen loads", async ({ page }, testInfo) => {
  await page.addInitScript(() => {
    window.localStorage.clear();
  });
  await page.goto("/");
  await attachStepScreenshot(page, testInfo, "login-screen");
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
  await expect(page.getByLabel("Username")).toBeVisible();
});

test("password visibility toggle switches input type", async ({ page }, testInfo) => {
  await page.addInitScript(() => {
    window.localStorage.clear();
  });
  await page.goto("/");
  await attachStepScreenshot(page, testInfo, "login-initial");
  const password = page.getByLabel("Password");
  await expect(password).toHaveAttribute("type", "password");
  await page.getByRole("button", { name: "Show" }).click();
  await attachStepScreenshot(page, testInfo, "login-password-shown");
  await expect(password).toHaveAttribute("type", "text");
  await page.getByRole("button", { name: "Hide" }).click();
  await attachStepScreenshot(page, testInfo, "login-password-hidden");
  await expect(password).toHaveAttribute("type", "password");
});

test("theme toggle switches icon", async ({ page }, testInfo) => {
  await page.addInitScript(() => {
    window.localStorage.clear();
  });
  await page.goto("/");
  await attachStepScreenshot(page, testInfo, "login-theme-light");
  const toggle = page.getByRole("button", { name: "Toggle theme" });
  await expect(toggle).toHaveText("☾");
  await toggle.click();
  await attachStepScreenshot(page, testInfo, "login-theme-dark");
  await expect(toggle).toHaveText("☀");
});
