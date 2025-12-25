export type RowKind = "class" | "pool";

export type WorkplaceRow = {
  id: string;
  name: string;
  kind: RowKind;
  dotColorClass: string;
};

export type VacationRange = {
  id: string;
  startISO: string;
  endISO: string;
};

export type Clinician = {
  id: string;
  name: string;
  qualifiedClassIds: string[];
  preferredClassIds: string[];
  vacations: VacationRange[];
};

export type Assignment = {
  id: string;
  rowId: string;
  dateISO: string;
  clinicianId: string;
};

export type MinSlots = { weekday: number; weekend: number };

export type AppState = {
  rows: WorkplaceRow[];
  clinicians: Clinician[];
  assignments: Assignment[];
  minSlotsByRowId: Record<string, MinSlots>;
  slotOverridesByKey?: Record<string, number>;
};

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

export async function getState(): Promise<AppState> {
  const res = await fetch(`${API_BASE}/v1/state`);
  if (!res.ok) {
    throw new Error(`Failed to fetch state: ${res.status}`);
  }
  return res.json();
}

export async function saveState(state: AppState): Promise<AppState> {
  const res = await fetch(`${API_BASE}/v1/state`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(state),
  });
  if (!res.ok) {
    throw new Error(`Failed to save state: ${res.status}`);
  }
  return res.json();
}

export async function solveDay(
  dateISO: string,
  options?: { onlyFillRequired?: boolean },
): Promise<{
  dateISO: string;
  assignments: Assignment[];
  notes: string[];
}> {
  const res = await fetch(`${API_BASE}/v1/solve`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      dateISO,
      only_fill_required: options?.onlyFillRequired ?? false,
    }),
  });
  if (!res.ok) {
    throw new Error(`Failed to solve day: ${res.status}`);
  }
  return res.json();
}
