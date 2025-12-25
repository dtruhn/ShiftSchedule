import { Assignment, WorkplaceRow } from "../../data/mockData";
import { cx } from "../../lib/classNames";
import { formatDayHeader, toISODate } from "../../lib/date";
import AssignmentPill from "./AssignmentPill";
import EmptySlotPill from "./EmptySlotPill";
import RowLabel from "./RowLabel";
import { useLayoutEffect, useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";

type ScheduleGridProps = {
  leftHeaderTitle: string;
  weekDays: Date[];
  rows: WorkplaceRow[];
  assignmentMap: Map<string, Assignment[]>;
  header?: React.ReactNode;
  getClinicianName: (clinicianId: string) => string;
  getIsQualified: (clinicianId: string, rowId: string) => boolean;
  getHasEligibleClasses: (clinicianId: string) => boolean;
  onCellClick: (args: { row: WorkplaceRow; date: Date }) => void;
  onClinicianClick?: (clinicianId: string) => void;
  onAutoAllocateDay?: (dateISO: string, options?: { onlyFillRequired?: boolean }) => void;
  onResetDay?: (dateISO: string) => void;
  onAutoAllocateWeek?: (options?: { onlyFillRequired?: boolean }) => void;
  onResetWeek?: () => void;
  onMoveWithinDay: (args: {
    dateISO: string;
    fromRowId: string;
    toRowId: string;
    assignmentId: string;
    clinicianId: string;
  }) => void;
  separatorBeforeRowIds?: string[];
  minSlotsByRowId?: Record<string, { weekday: number; weekend: number }>;
  slotOverridesByKey?: Record<string, number>;
  onRemoveEmptySlot?: (args: { rowId: string; dateISO: string }) => void;
};

export default function ScheduleGrid({
  leftHeaderTitle,
  weekDays,
  rows,
  assignmentMap,
  header,
  getClinicianName,
  getIsQualified,
  getHasEligibleClasses,
  onCellClick,
  onClinicianClick,
  onAutoAllocateDay,
  onResetDay,
  onAutoAllocateWeek,
  onResetWeek,
  onMoveWithinDay,
  separatorBeforeRowIds = [],
  minSlotsByRowId = {},
  slotOverridesByKey = {},
  onRemoveEmptySlot,
}: ScheduleGridProps) {
  const [dragState, setDragState] = useState<{
    dragging: {
      rowId: string;
      dateISO: string;
      assignmentId: string;
      clinicianId: string;
    } | null;
    dragOverKey: string | null;
  }>({ dragging: null, dragOverKey: null });
  const [todayBadgePos, setTodayBadgePos] = useState<{
    left: number;
    top: number;
  } | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const innerRef = useRef<HTMLDivElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const headerRefs = useRef<Array<HTMLDivElement | null>>([]);

  useLayoutEffect(() => {
    const todayISO = toISODate(new Date());
    const todayIndex = weekDays.findIndex((d) => toISODate(d) === todayISO);
    if (todayIndex === -1) {
      setTodayBadgePos(null);
      return;
    }

    const update = () => {
      const cell = headerRefs.current[todayIndex];
      const card = innerRef.current ?? cardRef.current;
      const scroll = scrollRef.current;
      if (!cell || !card || !scroll) {
        setTodayBadgePos(null);
        return;
      }
      const cellRect = cell.getBoundingClientRect();
      const cardRect = card.getBoundingClientRect();
      const scrollRect = scroll.getBoundingClientRect();
      setTodayBadgePos({
        left: cellRect.left - cardRect.left + cellRect.width / 2,
        top: scrollRect.top - cardRect.top,
      });
    };

    update();
    window.addEventListener("resize", update);
    const scrollEl = scrollRef.current;
    if (scrollEl) {
      scrollEl.addEventListener("scroll", update, { passive: true });
    }
    return () => {
      window.removeEventListener("resize", update);
      if (scrollEl) {
        scrollEl.removeEventListener("scroll", update);
      }
    };
  }, [weekDays]);

  return (
    <div className="mx-auto w-full max-w-7xl px-4 pb-8 sm:px-6 sm:pb-10">
      <div
        ref={cardRef}
        className="relative mt-4 rounded-2xl border-2 border-slate-900/80 bg-white p-[2px] shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:mt-6 sm:rounded-3xl"
      >
        <div
          ref={innerRef}
          className="relative overflow-hidden rounded-[calc(1.5rem-2px)] bg-white dark:bg-slate-900"
        >
          {header ? (
            <div className="relative z-0 border-b border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900 sm:px-6 sm:py-4">
              {header}
            </div>
          ) : null}
          {todayBadgePos ? (
            <span
              className="pointer-events-none absolute z-30 -translate-x-1/2 -translate-y-full rounded-full border border-sky-200 bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-sky-600 shadow-sm dark:border-sky-500/40 dark:bg-slate-900 dark:text-sky-200"
              style={{ left: todayBadgePos.left, top: todayBadgePos.top + 4 }}
            >
              Today
            </span>
          ) : null}
          <div
            ref={scrollRef}
            className="relative z-10 overflow-x-auto overflow-y-auto touch-pan-x touch-pan-y [-webkit-overflow-scrolling:touch] sm:overflow-visible"
          >
            <div className="min-w-full w-full">
              <div
                className="grid"
                style={{
                  gridTemplateColumns: `max-content repeat(${Math.max(
                    weekDays.length,
                    1,
                  )}, minmax(120px, 1fr))`,
                }}
              >
                <div className="flex items-center border-b border-r border-slate-200 bg-white px-3 py-2 dark:border-slate-800 dark:bg-slate-900 sm:px-4">
                  <div className="text-base font-semibold text-slate-900 dark:text-slate-100">
                    {leftHeaderTitle}
                  </div>
                </div>

                {weekDays.map((d, index) => {
                  const { weekday, dayOfMonth } = formatDayHeader(d);
                  const isLastCol = index === weekDays.length - 1;
                  const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                  const isOtherDay =
                    !!dragState.dragging && dragState.dragging.dateISO !== toISODate(d);
                  const isActiveDay =
                    !!dragState.dragging && dragState.dragging.dateISO === toISODate(d);
                  return (
                    <div
                      key={toISODate(d)}
                      ref={(node) => {
                        headerRefs.current[index] = node;
                      }}
                      className={cx(
                        "relative border-b border-r border-slate-200 px-3 py-2 text-center overflow-visible dark:border-slate-800 sm:px-4",
                        isWeekend
                          ? "bg-slate-100 dark:bg-slate-800"
                          : "bg-slate-50 dark:bg-slate-900",
                        isActiveDay && "bg-sky-50",
                        isOtherDay && "bg-slate-200/70 text-slate-400 opacity-60",
                        { "border-r-0": isLastCol },
                      )}
                    >
                      <div className="flex flex-col items-center gap-1">
                        <div className="text-[12px] font-semibold tracking-wide text-slate-500 dark:text-slate-300">
                          {weekday}
                        </div>
                        <div className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
                          {dayOfMonth}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {rows.map((row) => (
                  <RowSection
                    key={row.id}
                    row={row}
                    weekDays={weekDays}
                    assignmentMap={assignmentMap}
                    getClinicianName={getClinicianName}
                    getIsQualified={getIsQualified}
                    getHasEligibleClasses={getHasEligibleClasses}
                    onCellClick={onCellClick}
                    onClinicianClick={onClinicianClick}
                    onAutoAllocateDay={onAutoAllocateDay}
                    onAutoAllocateWeek={onAutoAllocateWeek}
                    onResetDay={onResetDay}
                    onResetWeek={onResetWeek}
                    onMoveWithinDay={onMoveWithinDay}
                    dragState={dragState}
                    setDragState={setDragState}
                    showSeparator={separatorBeforeRowIds.includes(row.id)}
                    minSlots={minSlotsByRowId[row.id] ?? { weekday: 0, weekend: 0 }}
                    slotOverridesByKey={slotOverridesByKey}
                    onRemoveEmptySlot={onRemoveEmptySlot}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function RowSection({
  row,
  weekDays,
  assignmentMap,
  getClinicianName,
  getIsQualified,
  getHasEligibleClasses,
  onCellClick,
  onClinicianClick,
  onAutoAllocateDay,
  onAutoAllocateWeek,
  onResetDay,
  onResetWeek,
  onMoveWithinDay,
  dragState,
  setDragState,
  showSeparator,
  minSlots,
  slotOverridesByKey,
  onRemoveEmptySlot,
}: {
  row: WorkplaceRow;
  weekDays: Date[];
  assignmentMap: Map<string, Assignment[]>;
  getClinicianName: (clinicianId: string) => string;
  getIsQualified: (clinicianId: string, rowId: string) => boolean;
  getHasEligibleClasses: (clinicianId: string) => boolean;
  onCellClick: (args: { row: WorkplaceRow; date: Date }) => void;
  onClinicianClick?: (clinicianId: string) => void;
  onAutoAllocateDay?: (dateISO: string, options?: { onlyFillRequired?: boolean }) => void;
  onAutoAllocateWeek?: (options?: { onlyFillRequired?: boolean }) => void;
  onResetDay?: (dateISO: string) => void;
  onResetWeek?: () => void;
  onMoveWithinDay: (args: {
    dateISO: string;
    fromRowId: string;
    toRowId: string;
    assignmentId: string;
    clinicianId: string;
  }) => void;
  dragState: {
    dragging: {
      rowId: string;
      dateISO: string;
      assignmentId: string;
      clinicianId: string;
    } | null;
    dragOverKey: string | null;
  };
  setDragState: Dispatch<
    SetStateAction<{
      dragging: {
        rowId: string;
        dateISO: string;
        assignmentId: string;
        clinicianId: string;
      } | null;
      dragOverKey: string | null;
    }>
  >;
  showSeparator: boolean;
  minSlots: { weekday: number; weekend: number };
  slotOverridesByKey: Record<string, number>;
  onRemoveEmptySlot?: (args: { rowId: string; dateISO: string }) => void;
}) {
  const rowBg =
    row.id === "pool-vacation"
      ? "bg-slate-200/80 dark:bg-slate-800/80"
      : row.id === "pool-manual"
        ? "bg-slate-50/70 dark:bg-slate-900/70"
        : "bg-white dark:bg-slate-900";
  const shouldInsertControlRow = showSeparator;
  const isDistributionPoolRow = row.id === "pool-not-allocated";
  const isManualPoolRow = row.id === "pool-manual";
  const borderBottomClass =
    row.id === "pool-vacation"
      ? "border-b-0"
      : isDistributionPoolRow
        ? "border-b-2 border-slate-200 dark:border-slate-800"
        : isManualPoolRow
          ? "border-b-2 border-slate-200 dark:border-slate-800"
          : "border-b border-slate-200 dark:border-slate-800";
  return (
    <>
      {shouldInsertControlRow ? (
        <ControlRow
          weekDays={weekDays}
          onAutoAllocateDay={onAutoAllocateDay}
          onAutoAllocateWeek={onAutoAllocateWeek}
          onResetDay={onResetDay}
          onResetWeek={onResetWeek}
        />
      ) : null}
      <div
        className={cx(
          "border-r border-slate-200 py-5 dark:border-slate-800",
          borderBottomClass,
          rowBg,
        )}
      >
        <RowLabel row={row} />
      </div>
      {weekDays.map((date, index) => {
        const dateISO = toISODate(date);
        const isLastCol = index === weekDays.length - 1;
        const key = `${row.id}__${dateISO}`;
        const assignments = assignmentMap.get(key) ?? [];
        const sortedAssignments =
          assignments.length > 1
            ? [...assignments].sort((a, b) => {
                const nameA = getClinicianName(a.clinicianId);
                const nameB = getClinicianName(b.clinicianId);
                const surnameA = nameA.trim().split(/\s+/).slice(-1)[0] ?? nameA;
                const surnameB = nameB.trim().split(/\s+/).slice(-1)[0] ?? nameB;
                const bySurname = surnameA.localeCompare(surnameB);
                return bySurname !== 0 ? bySurname : nameA.localeCompare(nameB);
              })
            : assignments;
        const isWeekend = date.getDay() === 0 || date.getDay() === 6;
        const minSlotsForDate = isWeekend ? minSlots.weekend : minSlots.weekday;
        const slotOverride = slotOverridesByKey[key] ?? 0;
        const targetSlots = Math.max(0, minSlotsForDate + slotOverride);
        const emptySlots =
          row.kind === "class"
            ? Math.max(0, targetSlots - assignments.length)
            : 0;
        const draggingDateISO = dragState.dragging?.dateISO ?? null;
        const isDragTarget =
          dragState.dragOverKey === key && draggingDateISO === dateISO;
        const isOtherDay = !!dragState.dragging && dragState.dragging.dateISO !== dateISO;
        const isActiveDay = !!dragState.dragging && dragState.dragging.dateISO === dateISO;
        const showQualified =
          !!dragState.dragging &&
          isActiveDay &&
          row.kind === "class" &&
          getIsQualified(dragState.dragging.clinicianId, row.id);

        return (
          <button
            key={key}
            type="button"
            onClick={() => onCellClick({ row, date })}
            onDragOver={(e) => {
              if (!dragState.dragging) return;
              if (dragState.dragging.dateISO !== dateISO) return;
              e.preventDefault();
              e.dataTransfer.dropEffect = "move";
              setDragState((s) => (s.dragOverKey === key ? s : { ...s, dragOverKey: key }));
            }}
            onDragLeave={() => {
              setDragState((s) => (s.dragOverKey === key ? { ...s, dragOverKey: null } : s));
            }}
            onDrop={(e) => {
              e.preventDefault();
              const raw = e.dataTransfer.getData("application/x-schedule-cell");
              if (!raw) return;
              try {
                const payload = JSON.parse(raw) as {
                  rowId: string;
                  dateISO: string;
                  assignmentId: string;
                  clinicianId: string;
                };
                if (payload.dateISO !== dateISO) return;
                if (payload.rowId === row.id) return;
                onMoveWithinDay({
                  dateISO,
                  fromRowId: payload.rowId,
                  toRowId: row.id,
                  assignmentId: payload.assignmentId,
                  clinicianId: payload.clinicianId,
                });
              } finally {
                setDragState({ dragging: null, dragOverKey: null });
              }
            }}
            className={cx(
              "group relative border-r border-slate-200 p-2 text-left dark:border-slate-800 sm:p-3",
              borderBottomClass,
              rowBg,
              "hover:bg-slate-50/70 active:bg-slate-50",
              { "border-r-0": isLastCol },
              isWeekend ? "bg-slate-100/70 dark:bg-slate-800/70" : "",
              showQualified && "border-emerald-400 ring-2 ring-emerald-300 ring-inset",
              {
                "ring-2 ring-sky-200 ring-inset bg-sky-50/40": isDragTarget,
                "bg-slate-200/70 text-slate-400 opacity-60 pointer-events-none":
                  isOtherDay,
              },
            )}
          >
            <div className="flex flex-col gap-1">
              {sortedAssignments.length > 0 ? (
                sortedAssignments.map((assignment) => (
                  <div
                    key={assignment.id}
                    draggable
                    onDragStart={(e) => {
                      e.stopPropagation();
                      e.dataTransfer.effectAllowed = "move";
                      e.dataTransfer.setData(
                        "application/x-schedule-cell",
                        JSON.stringify({
                          rowId: row.id,
                          dateISO,
                          assignmentId: assignment.id,
                          clinicianId: assignment.clinicianId,
                        }),
                      );
                      setDragState({
                        dragging: {
                          rowId: row.id,
                          dateISO,
                          assignmentId: assignment.id,
                          clinicianId: assignment.clinicianId,
                        },
                        dragOverKey: null,
                      });
                    }}
                    onClick={(e) => {
                      if (!onClinicianClick) return;
                      e.stopPropagation();
                      onClinicianClick(assignment.clinicianId);
                    }}
                    onDragEnd={() => setDragState({ dragging: null, dragOverKey: null })}
                    className="w-full cursor-grab active:cursor-grabbing"
                  >
                    <AssignmentPill
                      name={getClinicianName(assignment.clinicianId)}
                      showNoEligibilityWarning={
                        !getHasEligibleClasses(assignment.clinicianId)
                      }
                      showIneligibleWarning={
                        row.kind === "class" &&
                        !getIsQualified(assignment.clinicianId, row.id)
                      }
                    />
                  </div>
                ))
              ) : null}
              {emptySlots > 0
                ? Array.from({ length: emptySlots }).map((_, idx) => (
                    <EmptySlotPill
                      key={`${key}-empty-${idx}`}
                      onRemove={
                        onRemoveEmptySlot && row.kind === "class"
                          ? () =>
                              onRemoveEmptySlot({
                                rowId: row.id,
                                dateISO,
                              })
                          : undefined
                      }
                    />
                  ))
                : assignments.length === 0 && row.kind === "class"
                  ? (
                      <EmptySlotPill
                        key={`${key}-empty-ghost`}
                        variant="ghost"
                        showAddIcon
                        className="opacity-0 transition-opacity group-hover:opacity-100"
                      />
                    )
                  : null}
            </div>
          </button>
        );
      })}
    </>
  );
}

function Tooltip({ children }: { children: string }) {
  return (
    <span
      className={cx(
        "pointer-events-none absolute top-9 left-1/2 z-20 -translate-x-1/2 whitespace-nowrap rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-600 shadow-sm",
        "opacity-0 transition-opacity duration-75 group-hover:opacity-100",
      )}
    >
      {children}
    </span>
  );
}

function ControlRow({
  weekDays,
  onAutoAllocateDay,
  onAutoAllocateWeek,
  onResetDay,
  onResetWeek,
}: {
  weekDays: Date[];
  onAutoAllocateDay?: (dateISO: string, options?: { onlyFillRequired?: boolean }) => void;
  onAutoAllocateWeek?: (options?: { onlyFillRequired?: boolean }) => void;
  onResetDay?: (dateISO: string) => void;
  onResetWeek?: () => void;
}) {
  return (
    <>
      <div className="border-b border-r border-slate-200 bg-white px-5 py-3 overflow-visible dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-2">
          <ControlButton
            label="Only necessary (week)"
            onClick={() => onAutoAllocateWeek?.({ onlyFillRequired: true })}
          >
            <ArrowUpIcon className="h-7 w-7" />
          </ControlButton>
          <ControlButton
            label="Distribute all (week)"
            onClick={() => onAutoAllocateWeek?.({ onlyFillRequired: false })}
          >
            <ArrowUpDoubleIcon className="h-7 w-7" />
          </ControlButton>
          <ControlButton label="Reset to free (week)" onClick={() => onResetWeek?.()}>
            <ArrowDownDoubleIcon className="h-7 w-7" />
          </ControlButton>
        </div>
      </div>
      {weekDays.map((day, index) => {
        const dateISO = toISODate(day);
        const isLastCol = index === weekDays.length - 1;
        const isWeekend = day.getDay() === 0 || day.getDay() === 6;
        return (
          <div
            key={`control-${dateISO}`}
            className={cx(
              "border-b border-r border-slate-200 bg-white px-4 py-3 text-center overflow-visible dark:border-slate-800",
              "dark:bg-slate-900",
              { "border-r-0": isLastCol },
            )}
          >
            <div className="flex items-center justify-center gap-2">
              <ControlButton
                label="Only necessary (day)"
                onClick={() => onAutoAllocateDay?.(dateISO, { onlyFillRequired: true })}
              >
                <ArrowUpIcon className="h-7 w-7" />
              </ControlButton>
              <ControlButton
                label="Distribute all (day)"
                onClick={() => onAutoAllocateDay?.(dateISO, { onlyFillRequired: false })}
              >
                <ArrowUpDoubleIcon className="h-7 w-7" />
              </ControlButton>
              <ControlButton label="Reset to free (day)" onClick={() => onResetDay?.(dateISO)}>
                <ArrowDownDoubleIcon className="h-7 w-7" />
              </ControlButton>
            </div>
          </div>
        );
      })}
    </>
  );
}

function ControlButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        "group relative inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500",
        "hover:bg-slate-50 hover:text-slate-700",
        "dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700",
      )}
      aria-label={label}
    >
      {children}
      <Tooltip>{label}</Tooltip>
    </button>
  );
}

function ArrowUpDoubleIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <path
        d="M8 16 12 12l4 4"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8 11 12 7l4 4"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ArrowUpIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <path
        d="M8 14 12 10l4 4"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ArrowDownIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <path
        d="M8 10 12 14l4-4"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ArrowDownDoubleIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <path
        d="M8 8l4 4 4-4"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8 13l4 4 4-4"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
