import type { DayType, Holiday } from "../api/client";

export const DAY_TYPES: DayType[] = [
  "mon",
  "tue",
  "wed",
  "thu",
  "fri",
  "sat",
  "sun",
  "holiday",
];

export const DAY_TYPE_LABELS: Record<DayType, string> = {
  mon: "Mon",
  tue: "Tue",
  wed: "Wed",
  thu: "Thu",
  fri: "Fri",
  sat: "Sat",
  sun: "Sun",
  holiday: "Holiday",
};

export const WEEKEND_DAY_TYPES = new Set<DayType>(["sat", "sun", "holiday"]);

const DAY_TYPE_BY_INDEX: DayType[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

export function getDayType(dateISO: string, holidays?: Holiday[] | Set<string>): DayType {
  if (holidays) {
    const isHoliday =
      holidays instanceof Set
        ? holidays.has(dateISO)
        : holidays.some((holiday) => holiday.dateISO === dateISO);
    if (isHoliday) return "holiday";
  }
  const [year, month, day] = dateISO.split("-").map((value) => Number(value));
  const date = new Date(Date.UTC(year, (month ?? 1) - 1, day ?? 1));
  const idx = date.getUTCDay();
  return DAY_TYPE_BY_INDEX[idx] ?? "mon";
}

