import type { APIRequestContext, Page } from "@playwright/test";

const API_BASE = process.env.PLAYWRIGHT_API_URL ?? "http://localhost:8000";
const USERNAME = process.env.E2E_USERNAME ?? "admin";
const PASSWORD = process.env.E2E_PASSWORD ?? "change-me";
const TOKEN_STORAGE_KEY = "authToken";

export async function fetchAuthToken(request: APIRequestContext) {
  const response = await request.post(`${API_BASE}/auth/login`, {
    data: { username: USERNAME, password: PASSWORD },
  });
  if (!response.ok()) {
    throw new Error(
      `E2E login failed (${response.status()}): ${await response.text()}`,
    );
  }
  const data = (await response.json()) as { access_token?: string };
  if (!data.access_token) {
    throw new Error("E2E login failed: missing access token.");
  }
  return data.access_token;
}

export async function seedAuthToken(page: Page, token: string) {
  await page.addInitScript((value) => {
    window.localStorage.setItem("authToken", value);
  }, token);
}
