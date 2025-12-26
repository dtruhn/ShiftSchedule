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

export type Holiday = {
  dateISO: string;
  name: string;
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
  holidayCountry?: string;
  holidayYear?: number;
  holidays?: Holiday[];
};

export type UserRole = "admin" | "user";

export type AuthUser = {
  username: string;
  role: UserRole;
  active: boolean;
};

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8000";
const TOKEN_STORAGE_KEY = "authToken";

function readToken() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function setAuthToken(token: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
}

export function clearAuthToken() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(TOKEN_STORAGE_KEY);
}

function buildHeaders() {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  const token = readToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

export async function login(username: string, password: string): Promise<{
  access_token: string;
  token_type: string;
  user: AuthUser;
}> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: buildHeaders(),
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) {
    throw new Error(`Failed to login: ${res.status}`);
  }
  return res.json();
}

export async function getCurrentUser(): Promise<AuthUser> {
  const res = await fetch(`${API_BASE}/auth/me`, {
    headers: buildHeaders(),
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch user: ${res.status}`);
  }
  return res.json();
}

export async function listUsers(): Promise<AuthUser[]> {
  const res = await fetch(`${API_BASE}/auth/users`, {
    headers: buildHeaders(),
  });
  if (!res.ok) {
    throw new Error(`Failed to list users: ${res.status}`);
  }
  return res.json();
}

export async function createUser(payload: {
  username: string;
  password: string;
  role?: UserRole;
}): Promise<AuthUser> {
  const res = await fetch(`${API_BASE}/auth/users`, {
    method: "POST",
    headers: buildHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error(`Failed to create user: ${res.status}`);
  }
  return res.json();
}

export async function updateUser(
  username: string,
  payload: { active?: boolean; role?: UserRole; password?: string },
): Promise<AuthUser> {
  const res = await fetch(`${API_BASE}/auth/users/${encodeURIComponent(username)}`, {
    method: "PATCH",
    headers: buildHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error(`Failed to update user: ${res.status}`);
  }
  return res.json();
}

export async function deleteUser(username: string): Promise<void> {
  const res = await fetch(`${API_BASE}/auth/users/${encodeURIComponent(username)}`, {
    method: "DELETE",
    headers: buildHeaders(),
  });
  if (!res.ok) {
    throw new Error(`Failed to delete user: ${res.status}`);
  }
}

export async function getState(): Promise<AppState> {
  const res = await fetch(`${API_BASE}/v1/state`, {
    headers: buildHeaders(),
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch state: ${res.status}`);
  }
  return res.json();
}

export async function saveState(state: AppState): Promise<AppState> {
  const res = await fetch(`${API_BASE}/v1/state`, {
    method: "POST",
    headers: buildHeaders(),
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
    headers: buildHeaders(),
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
