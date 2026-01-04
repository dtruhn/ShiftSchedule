import { useState, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import type { Assignment, Clinician } from "../../api/client";
import type { ScheduleRow } from "../../lib/shiftRows";
import { calculateSolverLiveStats } from "../../lib/solverStats";

export type LiveSolution = {
  solution_num: number;
  time_ms: number;
  objective: number;
  assignments?: Assignment[];
};

type SolverOverlayProps = {
  isVisible: boolean;
  progress: { current: number; total: number } | null;
  elapsedMs: number;
  totalAllowedMs: number; // Total time allowed for solving
  solveRange: { startISO: string; endISO: string } | null;
  displayedRange: { startISO: string; endISO: string };
  onAbort: () => void;
  onApplySolution: () => void; // Separate handler for applying solution
  liveSolutions?: LiveSolution[];
  scheduleRows?: ScheduleRow[];
  clinicians?: Clinician[];
  holidays?: Set<string>;
  currentPhase?: string | null;
};

const formatDuration = (valueMs: number) => {
  const totalSeconds = Math.max(0, Math.floor(valueMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
};

const formatEuropeanDate = (dateISO: string) => {
  const [year, month, day] = dateISO.split("-");
  if (!year || !month || !day) return dateISO;
  return `${day}.${month}.${year}`;
};

// Check if two date ranges overlap
const rangesOverlap = (
  range1: { startISO: string; endISO: string },
  range2: { startISO: string; endISO: string },
): boolean => {
  return range1.startISO <= range2.endISO && range1.endISO >= range2.startISO;
};

// Minimal live chart for solutions - inverted so better (lower) scores appear higher, with log scale
function LiveSolutionChart({ solutions, elapsedMs }: { solutions: LiveSolution[]; elapsedMs: number }) {
  if (solutions.length === 0) return null;

  const chartWidth = 500;
  const chartHeight = 140;
  const padding = { top: 15, right: 15, bottom: 25, left: 55 };
  const innerWidth = chartWidth - padding.left - padding.right;
  const innerHeight = chartHeight - padding.top - padding.bottom;

  // Time range: 0 to max(elapsedMs, last solution time) + some padding
  const maxTimeMs = Math.max(elapsedMs, ...solutions.map((s) => s.time_ms)) * 1.1;
  const maxTimeSec = maxTimeMs / 1000;

  // Get min/max objectives (min is best)
  const minObjective = Math.min(...solutions.map((s) => s.objective));
  const maxObjective = Math.max(...solutions.map((s) => s.objective));

  // Calculate distances from minimum (for log scale)
  // Transform: distance from best = objective - minObjective
  const maxDistance = maxObjective - minObjective;
  const logMaxDistance = maxDistance > 0 ? Math.log10(maxDistance + 1) : 1;

  // Build path points with step function (each solution extends to the next one's time)
  // Y-axis is INVERTED with LOG SCALE: lower objective (better) = higher on chart
  const points: { x: number; y: number }[] = [];
  for (let i = 0; i < solutions.length; i++) {
    const s = solutions[i];
    // Distance from best (0 for best solution, larger for worse)
    const distance = s.objective - minObjective;
    // Log scale: compress large differences
    const logDistance = distance > 0 ? Math.log10(distance + 1) : 0;
    // Invert: best (logDistance=0) at top, worst at bottom
    const normalized = 1 - logDistance / logMaxDistance;

    const x = padding.left + (s.time_ms / 1000 / maxTimeSec) * innerWidth;
    const y = padding.top + (1 - normalized) * innerHeight;

    points.push({ x, y });

    // Extend horizontally to next solution or to current time
    const nextTime = i < solutions.length - 1 ? solutions[i + 1].time_ms : elapsedMs;
    const nextX = padding.left + (nextTime / 1000 / maxTimeSec) * innerWidth;
    points.push({ x: nextX, y });
  }

  const linePath =
    points.length > 0
      ? `M ${points.map((p) => `${p.x},${p.y}`).join(" L ")}`
      : "";

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={chartWidth} height={chartHeight} className="overflow-visible">
        {/* Grid lines */}
        <line
          x1={padding.left}
          y1={chartHeight - padding.bottom}
          x2={chartWidth - padding.right}
          y2={chartHeight - padding.bottom}
          stroke="currentColor"
          strokeOpacity={0.2}
        />
        <line
          x1={padding.left}
          y1={padding.top}
          x2={padding.left}
          y2={chartHeight - padding.bottom}
          stroke="currentColor"
          strokeOpacity={0.2}
        />

        {/* Solution line */}
        {linePath && (
          <path d={linePath} fill="none" stroke="#6366f1" strokeWidth={2} />
        )}

        {/* Solution dots */}
        {points
          .filter((_, i) => i % 2 === 0)
          .map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r={3} fill="#6366f1" />
          ))}

        {/* Y-axis label */}
        <text
          x={padding.left - 8}
          y={chartHeight / 2}
          textAnchor="middle"
          transform={`rotate(-90, ${padding.left - 8}, ${chartHeight / 2})`}
          className="fill-current text-[9px] opacity-50"
        >
          Score
        </text>

        {/* Y-axis values: top = best (min), bottom = worst (max) */}
        <text
          x={padding.left - 4}
          y={padding.top + 3}
          textAnchor="end"
          className="fill-current text-[9px] opacity-60"
        >
          {minObjective}
        </text>
        <text
          x={padding.left - 4}
          y={chartHeight - padding.bottom}
          textAnchor="end"
          className="fill-current text-[9px] opacity-60"
        >
          {maxObjective}
        </text>

        {/* X-axis label */}
        <text
          x={chartWidth / 2}
          y={chartHeight - 2}
          textAnchor="middle"
          className="fill-current text-[9px] opacity-50"
        >
          Time (s)
        </text>

        {/* Time markers */}
        <text
          x={padding.left}
          y={chartHeight - 8}
          textAnchor="start"
          className="fill-current text-[9px] opacity-40"
        >
          0
        </text>
        <text
          x={chartWidth - padding.right}
          y={chartHeight - 8}
          textAnchor="end"
          className="fill-current text-[9px] opacity-40"
        >
          {maxTimeSec.toFixed(1)}
        </text>
      </svg>
      <div className="flex items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400">
        <span>Solutions: {solutions.length}</span>
        <span>Best: {minObjective}</span>
      </div>
    </div>
  );
}


// Type for stats history entry
type StatsHistoryEntry = {
  time_ms: number;
  filledSlots: number;
  openSlots: number;
  nonConsecutiveShifts: number;
  peopleWeeksWithinHours: number;
  totalPeopleWeeksWithTarget: number;
  totalRequiredSlots: number;
  locationChanges: number;
};

// Stats chart for a single metric - same size as main solution chart
function MiniStatsChart({
  data,
  dataKey,
  elapsedMs,
  color,
  maxValue,
  labelSuffix,
}: {
  data: StatsHistoryEntry[];
  dataKey: keyof StatsHistoryEntry;
  elapsedMs: number;
  color: string;
  maxValue?: number;
  labelSuffix?: string; // e.g., "/42" for "x/y" format
}) {
  if (data.length === 0) return null;

  const width = 500;
  const height = 140;
  const padding = { top: 15, right: 45, bottom: 25, left: 55 }; // Extra right padding for label
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;

  const values = data.map((d) => d[dataKey] as number);
  const minVal = Math.min(...values);
  const maxVal = maxValue ?? Math.max(...values);
  const range = maxVal - minVal || 1;

  const maxTimeMs = Math.max(elapsedMs, ...data.map((d) => d.time_ms)) * 1.05;

  // Build step path - higher values at top
  const points: { x: number; y: number; value: number }[] = [];
  for (let i = 0; i < data.length; i++) {
    const d = data[i];
    const val = d[dataKey] as number;
    const normalized = (val - minVal) / range;
    const y = padding.top + (1 - normalized) * innerHeight;
    const x = padding.left + (d.time_ms / maxTimeMs) * innerWidth;
    points.push({ x, y, value: val });

    // Extend to next point or current time
    const nextTime = i < data.length - 1 ? data[i + 1].time_ms : elapsedMs;
    const nextX = padding.left + (nextTime / maxTimeMs) * innerWidth;
    points.push({ x: nextX, y, value: val });
  }

  const linePath = points.length > 0
    ? `M ${points.map((p) => `${p.x},${p.y}`).join(" L ")}`
    : "";

  // Get the current (last) value for the label
  const currentValue = points.length > 0 ? points[points.length - 1].value : 0;
  const lastPoint = points.length > 0 ? points[points.length - 1] : null;
  const labelText = labelSuffix ? `${currentValue}${labelSuffix}` : `${currentValue}`;

  return (
    <svg width={width} height={height} className="overflow-visible">
      {/* Background grid line */}
      <line
        x1={padding.left}
        y1={height - padding.bottom}
        x2={width - padding.right}
        y2={height - padding.bottom}
        stroke="currentColor"
        strokeOpacity={0.1}
      />
      {/* Line path */}
      {linePath && (
        <path d={linePath} fill="none" stroke={color} strokeWidth={1.5} />
      )}
      {/* Current value dot and label at leading edge */}
      {lastPoint && (
        <>
          <circle
            cx={lastPoint.x}
            cy={lastPoint.y}
            r={4}
            fill={color}
          />
          <text
            x={lastPoint.x + 8}
            y={lastPoint.y + 4}
            className="text-[11px] font-semibold"
            fill={color}
          >
            {labelText}
          </text>
        </>
      )}
      {/* Y-axis labels - higher values at top */}
      <text
        x={padding.left - 4}
        y={padding.top + 3}
        textAnchor="end"
        className="fill-current text-[9px] opacity-60"
      >
        {maxVal}
      </text>
      <text
        x={padding.left - 4}
        y={height - padding.bottom}
        textAnchor="end"
        className="fill-current text-[9px] opacity-60"
      >
        {minVal}
      </text>
      {/* X-axis labels */}
      <text
        x={padding.left}
        y={height - 5}
        className="fill-current text-[9px] opacity-40"
      >
        0
      </text>
      <text
        x={width - padding.right}
        y={height - 5}
        textAnchor="end"
        className="fill-current text-[9px] opacity-40"
      >
        {(Math.max(elapsedMs, ...data.map((d) => d.time_ms)) / 1000).toFixed(1)}
      </text>
      {/* Axis lines */}
      <line
        x1={padding.left}
        y1={height - padding.bottom}
        x2={width - padding.right}
        y2={height - padding.bottom}
        stroke="currentColor"
        strokeOpacity={0.2}
      />
      <line
        x1={padding.left}
        y1={padding.top}
        x2={padding.left}
        y2={height - padding.bottom}
        stroke="currentColor"
        strokeOpacity={0.2}
      />
    </svg>
  );
}

// Full-screen dashboard with all graphs
function SolverDashboard({
  liveSolutions,
  statsHistory,
  liveStats,
  elapsedMs,
  totalAllowedMs,
  onClose,
}: {
  liveSolutions: LiveSolution[];
  statsHistory: StatsHistoryEntry[];
  liveStats: {
    filledSlots: number;
    totalRequiredSlots: number;
    openSlots: number;
    nonConsecutiveShifts: number;
    peopleWeeksWithinHours: number;
    totalPeopleWeeksWithTarget: number;
    locationChanges: number;
  } | null;
  elapsedMs: number;
  totalAllowedMs: number;
  onClose: () => void;
}) {
  return createPortal(
    <div className="fixed inset-0 z-[1100] flex flex-col bg-white dark:bg-slate-900">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-700">
        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
          Solver Details
        </h2>
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium tabular-nums text-slate-600 dark:text-slate-300">
            {formatDuration(elapsedMs)} / {formatDuration(totalAllowedMs)}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 bg-white px-4 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:bg-slate-700"
          >
            ← Back
          </button>
        </div>
      </div>

      {/* Dashboard content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto flex max-w-3xl flex-col gap-8">
          {/* Score graph */}
          <div className="flex flex-col items-center gap-2">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              Score
            </h3>
            <LiveSolutionChart solutions={liveSolutions} elapsedMs={elapsedMs} />
          </div>

          {/* Filled Slots graph */}
          {liveStats && statsHistory.length > 1 && (
            <div className="flex flex-col items-center gap-2">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                Filled Slots
              </h3>
              <MiniStatsChart
                data={statsHistory}
                dataKey="filledSlots"
                elapsedMs={elapsedMs}
                color="#6366f1"
                maxValue={liveStats.totalRequiredSlots}
                labelSuffix={`/${liveStats.totalRequiredSlots}`}
              />
            </div>
          )}

          {/* Non-consecutive shifts graph */}
          {liveStats && statsHistory.length > 1 && (
            <div className="flex flex-col items-center gap-2">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                Non-consecutive Shifts
              </h3>
              <MiniStatsChart
                data={statsHistory}
                dataKey="nonConsecutiveShifts"
                elapsedMs={elapsedMs}
                color="#ef4444"
              />
            </div>
          )}

          {/* People-Weeks within working hours graph */}
          {liveStats && liveStats.totalPeopleWeeksWithTarget > 0 && statsHistory.length > 1 && (
            <div className="flex flex-col items-center gap-2">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                People-Weeks within Working Hours
              </h3>
              <MiniStatsChart
                data={statsHistory}
                dataKey="peopleWeeksWithinHours"
                elapsedMs={elapsedMs}
                color="#10b981"
                maxValue={liveStats.totalPeopleWeeksWithTarget}
                labelSuffix={`/${liveStats.totalPeopleWeeksWithTarget}`}
              />
            </div>
          )}

          {/* Location changes graph */}
          {liveStats && statsHistory.length > 1 && (
            <div className="flex flex-col items-center gap-2">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                Location Changes
              </h3>
              <MiniStatsChart
                data={statsHistory}
                dataKey="locationChanges"
                elapsedMs={elapsedMs}
                color="#f59e0b"
              />
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

export default function SolverOverlay({
  isVisible,
  progress,
  elapsedMs,
  totalAllowedMs,
  solveRange,
  displayedRange,
  onAbort,
  onApplySolution,
  liveSolutions = [],
  scheduleRows = [],
  clinicians = [],
  holidays = new Set(),
  currentPhase = null,
}: SolverOverlayProps) {
  const [dashboardOpen, setDashboardOpen] = useState(false);
  const [calendarContainer, setCalendarContainer] = useState<HTMLElement | null>(null);

  // Find the calendar container on mount
  useEffect(() => {
    // Find the parent of .calendar-scroll which has position:relative
    const scrollEl = document.querySelector('.calendar-scroll');
    const container = scrollEl?.parentElement;
    if (container instanceof HTMLElement) {
      setCalendarContainer(container);
    }
  }, []);

  // Build stats history from all solutions
  const statsHistory = useMemo(() => {
    if (!solveRange) return [];

    const history: StatsHistoryEntry[] = [];
    for (const solution of liveSolutions) {
      const assignments = solution.assignments ?? [];
      const stats = calculateSolverLiveStats(
        assignments,
        scheduleRows,
        clinicians,
        solveRange,
        holidays,
      );
      history.push({
        time_ms: solution.time_ms,
        ...stats,
      });
    }
    return history;
  }, [solveRange, liveSolutions, scheduleRows, clinicians, holidays]);

  // Calculate live stats for the current best solution (last entry in history)
  const liveStats = useMemo(() => {
    if (statsHistory.length === 0) return null;
    const last = statsHistory[statsHistory.length - 1];
    return {
      filledSlots: last.filledSlots,
      totalRequiredSlots: last.totalRequiredSlots,
      openSlots: last.openSlots,
      nonConsecutiveShifts: last.nonConsecutiveShifts,
      peopleWeeksWithinHours: last.peopleWeeksWithinHours,
      totalPeopleWeeksWithTarget: last.totalPeopleWeeksWithTarget,
      locationChanges: last.locationChanges,
    };
  }, [statsHistory]);

  // Check if the displayed week overlaps with the solve range
  const hasOverlap =
    isVisible && solveRange && rangesOverlap(solveRange, displayedRange);

  // Don't render if no overlap or no container found
  if (!hasOverlap || !calendarContainer) return null;

  const dateRangeLabel = solveRange
    ? `${formatEuropeanDate(solveRange.startISO)} – ${formatEuropeanDate(solveRange.endISO)}`
    : null;

  return createPortal(
    <div className="absolute inset-0 z-30 flex items-center justify-center">
      {/* Semi-transparent overlay */}
      <div className="absolute inset-0 bg-white/80 dark:bg-slate-900/80" />

      {/* Content panel - compact width that fits content */}
      <div className="relative z-10 flex max-h-[90%] w-auto max-w-lg flex-col items-center gap-4 overflow-y-auto rounded-2xl border border-slate-200 bg-white px-8 py-6 shadow-2xl dark:border-slate-700 dark:bg-slate-900">
        {/* Animated spinner */}
        <div className="relative h-14 w-14">
          <svg
            className="h-14 w-14 animate-spin"
            viewBox="0 0 64 64"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle
              cx="32"
              cy="32"
              r="28"
              stroke="currentColor"
              strokeWidth="4"
              className="text-slate-200 dark:text-slate-700"
            />
            <path
              d="M32 4a28 28 0 0 1 28 28"
              stroke="currentColor"
              strokeWidth="4"
              strokeLinecap="round"
              className="text-indigo-500"
            />
          </svg>
        </div>

        {/* Title and date range */}
        <div className="flex flex-col items-center gap-1">
          <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100">
            Optimizing Schedule
          </h3>
          {dateRangeLabel && (
            <p className="text-sm font-medium text-indigo-600 dark:text-indigo-400">
              {dateRangeLabel}
            </p>
          )}
          <p className="mt-1 text-center text-xs text-slate-500 dark:text-slate-400">
            Schedule is locked during optimization
          </p>
        </div>

        {/* Preparation phase indicator - shown before solutions arrive */}
        {currentPhase && liveSolutions.length === 0 && (
          <div className="flex items-center gap-3 rounded-lg bg-slate-50 px-4 py-3 dark:bg-slate-800">
            <div className="h-2 w-2 animate-pulse rounded-full bg-indigo-500" />
            <span className="text-sm text-slate-600 dark:text-slate-300">
              {currentPhase}
            </span>
          </div>
        )}

        {/* Live solutions chart */}
        {liveSolutions.length > 0 && (
          <LiveSolutionChart solutions={liveSolutions} elapsedMs={elapsedMs} />
        )}

        {/* Elapsed / Total time */}
        <div className="text-sm font-medium tabular-nums text-slate-600 dark:text-slate-300">
          {formatDuration(elapsedMs)} / {formatDuration(totalAllowedMs)}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-3">
          {/* Details button - only shown when solutions exist */}
          {liveSolutions.length > 0 && (
            <button
              type="button"
              onClick={() => setDashboardOpen(true)}
              className="rounded-lg border border-slate-200 bg-white px-4 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:bg-slate-700"
            >
              Details
            </button>
          )}

          {/* Abort button - always shown */}
          <button
            type="button"
            onClick={onAbort}
            className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-1.5 text-sm font-medium text-rose-600 transition-colors hover:border-rose-300 hover:bg-rose-100 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-2 dark:border-rose-800 dark:bg-rose-950 dark:text-rose-300 dark:hover:border-rose-700 dark:hover:bg-rose-900"
          >
            Abort
          </button>

          {/* Apply Solution button - only shown when solutions exist */}
          {liveSolutions.length > 0 && (
            <button
              type="button"
              onClick={onApplySolution}
              className="rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-1.5 text-sm font-medium text-indigo-600 transition-colors hover:border-indigo-300 hover:bg-indigo-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:border-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 dark:hover:border-indigo-700 dark:hover:bg-indigo-900"
            >
              Apply Solution
            </button>
          )}
        </div>

        {/* Full-screen dashboard */}
        {dashboardOpen && (
          <SolverDashboard
            liveSolutions={liveSolutions}
            statsHistory={statsHistory}
            liveStats={liveStats}
            elapsedMs={elapsedMs}
            totalAllowedMs={totalAllowedMs}
            onClose={() => setDashboardOpen(false)}
          />
        )}
      </div>
    </div>,
    calendarContainer,
  );
}
