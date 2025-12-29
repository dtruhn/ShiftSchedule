import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { SolverSettings } from "../../api/client";
import type { RenderedAssignment } from "../../lib/schedule";
import type { ScheduleRow } from "../../lib/shiftRows";
import ScheduleGrid from "./ScheduleGrid";

const baseRow: ScheduleRow = {
  id: "class-1::s1",
  name: "MRI",
  kind: "class",
  dotColorClass: "bg-slate-200",
  parentId: "class-1",
  parentName: "MRI",
  subShiftName: "Shift 1",
  subShiftOrder: 1,
  subShiftStartTime: "08:00",
  subShiftEndTime: "16:00",
  subShiftEndDayOffset: 0,
};

const baseSettings: SolverSettings = {
  allowMultipleShiftsPerDay: false,
  enforceSameLocationPerDay: false,
  onCallRestEnabled: false,
  onCallRestClassId: "",
  onCallRestDaysBefore: 0,
  onCallRestDaysAfter: 0,
};

const renderGrid = (settings: SolverSettings) => {
  const weekDays = [new Date(2026, 0, 5)];
  const dateISO = "2026-01-05";
  const assignments: RenderedAssignment[] = [
    {
      id: "assign-1",
      rowId: baseRow.id,
      dateISO,
      clinicianId: "clin-1",
    },
  ];
  const assignmentMap = new Map([[`${baseRow.id}__${dateISO}`, assignments]]);
  return render(
    <ScheduleGrid
      leftHeaderTitle="Week"
      weekDays={weekDays}
      rows={[baseRow]}
      assignmentMap={assignmentMap}
      solverSettings={settings}
      getClinicianName={() => "Dr. Alice"}
      getIsQualified={() => true}
      getHasEligibleClasses={() => true}
      onCellClick={vi.fn()}
      onMoveWithinDay={vi.fn()}
    />,
  );
};

describe("ScheduleGrid", () => {
  it("hides assignment time labels when multiple shifts per day is disabled", () => {
    renderGrid(baseSettings);
    const pill = screen.getByText("Dr. Alice").closest("[data-assignment-pill=\"true\"]");
    expect(pill).not.toBeNull();
    expect(within(pill as HTMLElement).queryByText("08:00 - 16:00")).toBeNull();
  });

  it("shows assignment time labels when multiple shifts per day is enabled", () => {
    renderGrid({ ...baseSettings, allowMultipleShiftsPerDay: true });
    const pill = screen.getByText("Dr. Alice").closest("[data-assignment-pill=\"true\"]");
    expect(pill).not.toBeNull();
    expect(within(pill as HTMLElement).getByText("08:00 - 16:00")).toBeInTheDocument();
  });
});
