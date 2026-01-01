import {
  test as base,
  expect,
  type APIRequestContext,
  type ConsoleMessage,
  type Page,
  type Frame,
  type Request,
  type Response,
} from "@playwright/test";
import fs from "node:fs/promises";

const API_BASE = process.env.PLAYWRIGHT_API_URL ?? "http://localhost:8000";
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:5173";
const BODY_LIMIT = 50 * 1024;
const SECRET_KEYS = ["password", "access_token", "refresh_token", "token", "authToken"];

type DiagnosticsEvent = {
  ts: string;
  kind:
    | "env"
    | "console"
    | "pageerror"
    | "requestfailed"
    | "response"
    | "navigation"
    | "preflight";
  level?: string;
  message?: string;
  url?: string;
  method?: string;
  status?: number;
  resourceType?: string;
  failureText?: string;
  location?: { url?: string; line?: number; column?: number };
  stack?: string;
  body?: string;
};

const redactText = (value: string) => {
  let redacted = value;
  redacted = redacted.replace(
    /Bearer\s+[A-Za-z0-9._~+-/]+=*/gi,
    "Bearer [REDACTED]",
  );
  redacted = redacted.replace(
    /"(access_token|refresh_token|token|authToken|password)"\s*:\s*"[^"]*"/gi,
    '"$1":"[REDACTED]"',
  );
  redacted = redacted.replace(
    /(access_token|refresh_token|token|authToken|password)=([^&\s]+)/gi,
    "$1=[REDACTED]",
  );
  redacted = redacted.replace(
    /[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+/g,
    "[REDACTED_JWT]",
  );
  return redacted;
};

const redactJson = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map((item) => redactJson(item));
  }
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value)) {
      if (SECRET_KEYS.some((secret) => key.toLowerCase().includes(secret))) {
        out[key] = "[REDACTED]";
      } else {
        out[key] = redactJson(val);
      }
    }
    return out;
  }
  if (typeof value === "string") return redactText(value);
  return value;
};

const limitBody = (text: string) => {
  if (text.length <= BODY_LIMIT) return text;
  const omitted = text.length - BODY_LIMIT;
  return `${text.slice(0, BODY_LIMIT)}\n...[truncated ${omitted} bytes]`;
};

const isApiUrl = (url: string) => {
  if (url.startsWith(API_BASE)) return true;
  try {
    const parsed = new URL(url);
    return parsed.pathname.startsWith("/api");
  } catch {
    return url.includes("/api");
  }
};

class DiagnosticsCollector {
  baseUrl = BASE_URL;
  apiUrl = API_BASE;
  lastUrl = "";
  events: DiagnosticsEvent[] = [];

  record(event: Omit<DiagnosticsEvent, "ts">) {
    this.events.push({ ts: new Date().toISOString(), ...event });
  }

  recordConsole(msg: ConsoleMessage) {
    const location = msg.location();
    this.record({
      kind: "console",
      level: msg.type(),
      message: redactText(msg.text()),
      location: location.url
        ? {
            url: location.url,
            line: location.lineNumber,
            column: location.columnNumber,
          }
        : undefined,
    });
  }

  recordPageError(error: Error) {
    this.record({
      kind: "pageerror",
      message: redactText(error.message),
      stack: redactText(error.stack ?? ""),
    });
  }

  recordNavigation(url: string) {
    this.lastUrl = url;
    this.record({ kind: "navigation", url });
  }

  recordRequestFailed(request: Request) {
    const failure = request.failure();
    this.record({
      kind: "requestfailed",
      method: request.method(),
      url: request.url(),
      resourceType: request.resourceType(),
      failureText: failure?.errorText,
    });
  }

  async recordResponse(response: Response) {
    const status = response.status();
    if (status < 400) return;
    const request = response.request();
    const url = response.url();
    const entry: DiagnosticsEvent = {
      kind: "response",
      status,
      method: request.method(),
      url,
      resourceType: request.resourceType(),
    };
    if (isApiUrl(url)) {
      const contentType = response.headers()["content-type"] ?? "";
      if (contentType.includes("application/json") || contentType.startsWith("text/")) {
        try {
          const text = await response.text();
          if (contentType.includes("application/json")) {
            try {
              const parsed = JSON.parse(text) as unknown;
              entry.body = limitBody(
                redactText(JSON.stringify(redactJson(parsed), null, 2)),
              );
            } catch {
              entry.body = limitBody(redactText(text));
            }
          } else {
            entry.body = limitBody(redactText(text));
          }
        } catch (error) {
          entry.body = `<<failed to read body: ${String(error)}>>`;
        }
      }
    }
    this.events.push({ ts: new Date().toISOString(), ...entry });
  }

  async preflight(request: APIRequestContext) {
    this.record({
      kind: "env",
      message: `PLAYWRIGHT_BASE_URL=${this.baseUrl} PLAYWRIGHT_API_URL=${this.apiUrl}`,
    });
    const response = await request.get(`${this.apiUrl}/health`);
    const status = response.status();
    let bodyText = "";
    try {
      bodyText = await response.text();
    } catch {
      bodyText = "";
    }
    this.record({
      kind: "preflight",
      status,
      url: `${this.apiUrl}/health`,
      body: bodyText ? limitBody(redactText(bodyText)) : undefined,
    });
    if (status !== 200) {
      throw new Error(
        `Preflight failed: ${this.apiUrl}/health returned ${status}${
          bodyText ? ` (${bodyText})` : ""
        }`,
      );
    }
  }
}

export const test = base.extend<{ diagnostics: DiagnosticsCollector }>({
  diagnostics: async ({ page }, use) => {
    const collector = new DiagnosticsCollector();
    const handleConsole = (msg: ConsoleMessage) => collector.recordConsole(msg);
    const handlePageError = (error: Error) => collector.recordPageError(error);
    const handleRequestFailed = (request: Request) =>
      collector.recordRequestFailed(request);
    const handleResponse = (response: Response) =>
      collector.recordResponse(response);
    const handleNavigation = (frame: Frame) => {
      if (frame === page.mainFrame()) {
        collector.recordNavigation(frame.url());
      }
    };
    page.on("console", handleConsole);
    page.on("pageerror", handlePageError);
    page.on("requestfailed", handleRequestFailed);
    page.on("response", handleResponse);
    page.on("framenavigated", handleNavigation);

    try {
      await use(collector);
    } finally {
      page.off("console", handleConsole);
      page.off("pageerror", handlePageError);
      page.off("requestfailed", handleRequestFailed);
      page.off("response", handleResponse);
      page.off("framenavigated", handleNavigation);
    }
  },
});

test.beforeEach(async ({ request, diagnostics }) => {
  await diagnostics.preflight(request);
});

test.afterEach(async ({ page, diagnostics }, testInfo) => {
  if (testInfo.status === testInfo.expectedStatus) return;
  const diagnosticsPath = testInfo.outputPath("diagnostics.json");
  await fs.writeFile(
    diagnosticsPath,
    JSON.stringify(
      {
        baseUrl: diagnostics.baseUrl,
        apiUrl: diagnostics.apiUrl,
        lastUrl: diagnostics.lastUrl,
        events: diagnostics.events,
      },
      null,
      2,
    ),
  );
  await testInfo.attach("diagnostics.json", {
    path: diagnosticsPath,
    contentType: "application/json",
  });
  if (page && !page.isClosed()) {
    const screenshotPath = testInfo.outputPath("failure.png");
    await page.screenshot({ path: screenshotPath, fullPage: true });
    await testInfo.attach("failure.png", {
      path: screenshotPath,
      contentType: "image/png",
    });
    const htmlPath = testInfo.outputPath("page.html");
    const html = await page.content().catch(() => "");
    if (html) {
      await fs.writeFile(htmlPath, html);
      await testInfo.attach("page.html", {
        path: htmlPath,
        contentType: "text/html",
      });
    }
  }
});

export { expect };
