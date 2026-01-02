import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { RenderedAssignment } from "../../lib/schedule";
import type { ScheduleRow } from "../../lib/shiftRows";
import ScheduleGrid from "./ScheduleGrid";

const baseRow: ScheduleRow = {
  id: "slot-1",
  name: "MRI",
  kind: "class",
  dotColorClass: "bg-slate-200",
  sectionId: "class-1",
  sectionName: "MRI",
  slotLabel: "Shift 1",
  startTime: "08:00",
  endTime: "16:00",
  endDayOffset: 0,
};

const renderGrid = () => {
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
      getClinicianName={() => "Dr. Alice"}
      getIsQualified={() => true}
      getHasEligibleClasses={() => true}
      onCellClick={vi.fn()}
      onMoveWithinDay={vi.fn()}
    />,
  );
};

describe("ScheduleGrid", () => {
  it("hides assignment time labels (time labels are always hidden)", () => {
    renderGrid();
    const pill = screen.getByText("Dr. Alice").closest("[data-assignment-pill=\"true\"]");
    expect(pill).not.toBeNull();
    expect(within(pill as HTMLElement).queryByText("08:00 - 16:00")).toBeNull();
  });
});
