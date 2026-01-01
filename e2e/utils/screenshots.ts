import type { Page, TestInfo } from "@playwright/test";

export async function attachStepScreenshot(
  page: Page,
  testInfo: TestInfo,
  name: string,
  fullPage = true,
) {
  const body = await page.screenshot({ fullPage });
  await testInfo.attach(`${name}.png`, { body, contentType: "image/png" });
}
