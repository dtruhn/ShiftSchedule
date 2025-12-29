import { expect, test } from "@playwright/test";
import { fetchAuthToken, seedAuthToken } from "./utils/auth";

const API_BASE = process.env.PLAYWRIGHT_API_URL ?? "http://localhost:8000";

const toISODate = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const startOfWeek = (date: Date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - day);
  return d;
};

type TestClassRow = {
  id: string;
  name: string;
  locationId?: string;
  startTime?: string;
  endTime?: string;
  endDayOffset?: number;
};

type TestAssignment = {
  id: string;
  rowId: string;
  dateISO: string;
  clinicianId: string;
};

const poolRowId = "pool-not-allocated";
const primaryClassId = "class-1";
const secondaryClassId = "class-2";
const classRowId = `${primaryClassId}::s1`;
const secondaryClassRowId = `${secondaryClassId}::s1`;

const defaultSolverSettings = {
  allowMultipleShiftsPerDay: false,
  enforceSameLocationPerDay: false,
  onCallRestEnabled: false,
  onCallRestClassId: "",
  onCallRestDaysBefore: 0,
  onCallRestDaysAfter: 0,
};

const makeClassRow = (row: TestClassRow) => ({
  id: row.id,
  name: row.name,
  kind: "class",
  dotColorClass: "bg-slate-200",
  locationId: row.locationId ?? "loc-default",
  subShifts: [
    {
      id: "s1",
      name: "Shift 1",
      order: 1,
      startTime: row.startTime ?? "08:00",
      endTime: row.endTime ?? "16:00",
      endDayOffset: row.endDayOffset ?? 0,
    },
  ],
});

const buildTestState = ({
  dateISO,
  classRows = [{ id: primaryClassId, name: "On Call" }],
  assignments,
  solverSettings = {},
  locationsEnabled = true,
}: {
  dateISO: string;
  classRows?: TestClassRow[];
  assignments?: TestAssignment[];
  solverSettings?: Partial<typeof defaultSolverSettings>;
  locationsEnabled?: boolean;
}) => {
  const classRowDefs = classRows.map((row) => makeClassRow(row));
  const clinician = {
    id: "clin-1",
    name: "Dr. Test",
    qualifiedClassIds: classRowDefs.map((row) => row.id),
    preferredClassIds: classRowDefs.map((row) => row.id),
    vacations: [],
  };
  const nextAssignments =
    assignments ??
    [
      {
        id: `assign-${dateISO}-clin-1`,
        rowId: poolRowId,
        dateISO,
        clinicianId: "clin-1",
      },
    ];
  const minSlotsByRowId = Object.fromEntries(
    classRowDefs.map((row) => [`${row.id}::s1`, { weekday: 1, weekend: 1 }]),
  );

  return {
    locations: [{ id: "loc-default", name: "Default" }],
    locationsEnabled,
    rows: [
      {
        id: "pool-not-allocated",
        name: "Distribution Pool",
        kind: "pool",
        dotColorClass: "bg-slate-200",
      },
      {
        id: "pool-manual",
        name: "Reserve Pool",
        kind: "pool",
        dotColorClass: "bg-slate-200",
      },
      {
        id: "pool-rest-day",
        name: "Rest Day",
        kind: "pool",
        dotColorClass: "bg-slate-200",
      },
      {
        id: "pool-vacation",
        name: "Vacation",
        kind: "pool",
        dotColorClass: "bg-slate-200",
      },
      ...classRowDefs,
    ],
    clinicians: [clinician],
    assignments: nextAssignments,
    minSlotsByRowId,
    slotOverridesByKey: {},
    holidays: [],
    publishedWeekStartISOs: [],
    solverSettings: { ...defaultSolverSettings, ...solverSettings },
    solverRules: [],
  };
};

const today = new Date();
const weekStart = startOfWeek(today);
const testDateISO = toISODate(weekStart);

test.describe.serial("app flows", () => {
  let token = "";
  let originalState: unknown = null;

  test.beforeAll(async ({ request }) => {
    token = await fetchAuthToken(request);
    const stateRes = await request.get(`${API_BASE}/v1/state`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!stateRes.ok()) {
      throw new Error(`Failed to fetch state: ${stateRes.status()}`);
    }
    originalState = await stateRes.json();
  });

  test.afterAll(async ({ request }) => {
    if (!token || !originalState) return;
    await request.post(`${API_BASE}/v1/state`, {
      headers: { Authorization: `Bearer ${token}` },
      data: originalState,
    });
  });

  test.beforeEach(async ({ page, request }) => {
    await seedAuthToken(page, token);
    await request.post(`${API_BASE}/v1/state`, {
      headers: { Authorization: `Bearer ${token}` },
      data: buildTestState({ dateISO: testDateISO }),
    });
  });

  test("schedule view loads with core panels", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Automated Shift Planning")).toBeVisible();
    await expect(page.getByRole("button", { name: "Open Export" })).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Open Vacation Planner" }),
    ).toBeVisible();
    await expect(page.locator('[data-schedule-grid="true"]')).toBeVisible();
  });

  test("settings view opens from top bar", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Settings" }).click();
    await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
    await expect(page.getByText("Sections and Shifts")).toBeVisible();
  });

  test("vacation overview modal opens", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Open Vacation Planner" }).click();
    await expect(page.getByText("Vacation Overview")).toBeVisible();
    await page
      .getByRole("button", { name: "Close" })
      .filter({ hasText: "Close" })
      .click();
    await expect(page.getByText("Vacation Overview")).toBeHidden();
  });

  test("dragging a clinician from pool assigns them to a shift", async ({ page }) => {
    await page.goto("/");
    const poolCell = page.locator(
      `[data-schedule-cell=\"true\"][data-row-id=\"${poolRowId}\"][data-date-iso=\"${testDateISO}\"]`,
    );
    const shiftCell = page.locator(
      `[data-schedule-cell=\"true\"][data-row-id=\"${classRowId}\"][data-date-iso=\"${testDateISO}\"]`,
    );
    const draggable = poolCell.locator('div[draggable="true"]').first();
    await expect(draggable).toBeVisible();
    await draggable.dragTo(shiftCell);
    await expect(shiftCell.getByText("Dr. Test")).toBeVisible();
  });

  test("solver allocates open slots in the visible week", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Use visible week" }).click();
    await page.getByRole("button", { name: "Run automated planning" }).click();
    const shiftCell = page.locator(
      `[data-schedule-cell=\"true\"][data-row-id=\"${classRowId}\"][data-date-iso=\"${testDateISO}\"]`,
    );
    await expect(shiftCell.getByText("Dr. Test")).toBeVisible();
  });

  test("dragging a clinician back to the pool removes the shift assignment", async ({
    page,
    request,
  }) => {
    await request.post(`${API_BASE}/v1/state`, {
      headers: { Authorization: `Bearer ${token}` },
      data: buildTestState({
        dateISO: testDateISO,
        assignments: [
          {
            id: `assign-${testDateISO}-clin-1`,
            rowId: classRowId,
            dateISO: testDateISO,
            clinicianId: "clin-1",
          },
        ],
      }),
    });
    await page.goto("/");
    const poolCell = page.locator(
      `[data-schedule-cell=\"true\"][data-row-id=\"${poolRowId}\"][data-date-iso=\"${testDateISO}\"]`,
    );
    const shiftCell = page.locator(
      `[data-schedule-cell=\"true\"][data-row-id=\"${classRowId}\"][data-date-iso=\"${testDateISO}\"]`,
    );
    const draggable = shiftCell.locator('div[draggable="true"]').first();
    await expect(draggable).toBeVisible();
    await draggable.dragTo(poolCell);
    await expect(shiftCell.getByText("Dr. Test")).toHaveCount(0);
    await expect(poolCell.getByText("Dr. Test")).toBeVisible();
  });

  test("reset to distribution pool clears assignments in range", async ({
    page,
    request,
  }) => {
    await request.post(`${API_BASE}/v1/state`, {
      headers: { Authorization: `Bearer ${token}` },
      data: buildTestState({
        dateISO: testDateISO,
        assignments: [
          {
            id: `assign-${testDateISO}-clin-1`,
            rowId: classRowId,
            dateISO: testDateISO,
            clinicianId: "clin-1",
          },
        ],
      }),
    });
    await page.goto("/");
    await page.getByRole("button", { name: "Use visible week" }).click();
    page.once("dialog", (dialog) => dialog.accept());
    await page.getByRole("button", { name: /Reset to Distribution Pool/i }).click();
    const poolCell = page.locator(
      `[data-schedule-cell=\"true\"][data-row-id=\"${poolRowId}\"][data-date-iso=\"${testDateISO}\"]`,
    );
    const shiftCell = page.locator(
      `[data-schedule-cell=\"true\"][data-row-id=\"${classRowId}\"][data-date-iso=\"${testDateISO}\"]`,
    );
    await expect(shiftCell.getByText("Dr. Test")).toHaveCount(0);
    await expect(poolCell.getByText("Dr. Test")).toBeVisible();
  });

  test("rule violations highlight pills in red", async ({ page, request }) => {
    await request.post(`${API_BASE}/v1/state`, {
      headers: { Authorization: `Bearer ${token}` },
      data: buildTestState({
        dateISO: testDateISO,
        classRows: [
          { id: primaryClassId, name: "On Call" },
          { id: secondaryClassId, name: "MRI" },
        ],
        assignments: [
          {
            id: `assign-${testDateISO}-clin-1-a`,
            rowId: classRowId,
            dateISO: testDateISO,
            clinicianId: "clin-1",
          },
          {
            id: `assign-${testDateISO}-clin-1-b`,
            rowId: secondaryClassRowId,
            dateISO: testDateISO,
            clinicianId: "clin-1",
          },
        ],
      }),
    });
    await page.goto("/");
    const firstCell = page.locator(
      `[data-schedule-cell=\"true\"][data-row-id=\"${classRowId}\"][data-date-iso=\"${testDateISO}\"]`,
    );
    const secondCell = page.locator(
      `[data-schedule-cell=\"true\"][data-row-id=\"${secondaryClassRowId}\"][data-date-iso=\"${testDateISO}\"]`,
    );
    await expect(firstCell.getByText("Dr. Test")).toBeVisible();
    await expect(secondCell.getByText("Dr. Test")).toBeVisible();
    await expect(
      firstCell.locator('[data-assignment-pill="true"]'),
    ).toHaveClass(/border-rose-300/);
    await expect(
      secondCell.locator('[data-assignment-pill="true"]'),
    ).toHaveClass(/border-rose-300/);
  });

  test("disabling locations hides per-section location selector", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Settings" }).click();
    const sectionSelects = page.locator('[data-section-panel="true"] select');
    await expect(sectionSelects.first()).toBeVisible();
    const locationsPanel = page.getByText("Locations").locator("..").locator("..");
    page.once("dialog", (dialog) => dialog.accept());
    await locationsPanel.getByRole("switch").click();
    await expect(sectionSelects).toHaveCount(0);
  });
});
