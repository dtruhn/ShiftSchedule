import { describe, expect, it } from "vitest";
import { buildShiftInterval, intervalsOverlap } from "./schedule";
import type { ScheduleRow } from "./shiftRows";

const baseRow: ScheduleRow = {
  id: "row-1",
  name: "MRI",
  kind: "class",
  dotColorClass: "bg-slate-200",
  startTime: "08:00",
  endTime: "16:00",
  endDayOffset: 0,
};

describe("intervalsOverlap", () => {
  it("returns false when intervals only touch at the edge", () => {
    expect(intervalsOverlap({ start: 0, end: 60 }, { start: 60, end: 120 })).toBe(
      false,
    );
  });

  it("returns true when intervals overlap", () => {
    expect(intervalsOverlap({ start: 0, end: 90 }, { start: 60, end: 120 })).toBe(
      true,
    );
  });
});

describe("buildShiftInterval", () => {
  it("builds an interval with day offset applied", () => {
    const row: ScheduleRow = {
      ...baseRow,
      endDayOffset: 1,
    };
    expect(buildShiftInterval(row)).toEqual({ start: 480, end: 2400 });
  });

  it("returns null when end time is not after start", () => {
    const row: ScheduleRow = {
      ...baseRow,
      endTime: "08:00",
    };
    expect(buildShiftInterval(row)).toBeNull();
  });

  it("ignores non-class rows", () => {
    const row: ScheduleRow = {
      id: "pool-row",
      name: "Pool",
      kind: "pool",
      dotColorClass: "bg-slate-200",
    };
    expect(buildShiftInterval(row)).toBeNull();
  });
});
