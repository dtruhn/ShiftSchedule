import { cx } from "../../lib/classNames";
import type { DragEventHandler, MouseEventHandler } from "react";
import type { AvailabilitySegment } from "../../lib/schedule";

type AssignmentPillProps = {
  name: string;
  timeLabel?: string;
  timeSegments?: AvailabilitySegment[];
  showNoEligibilityWarning?: boolean;
  showIneligibleWarning?: boolean;
  isHighlighted?: boolean;
  isViolation?: boolean;
  isDragging?: boolean;
  isDragFocus?: boolean;
  className?: string;
  draggable?: boolean;
  onDragStart?: DragEventHandler<HTMLDivElement>;
  onDragEnd?: DragEventHandler<HTMLDivElement>;
  onClick?: MouseEventHandler<HTMLDivElement>;
};

export default function AssignmentPill({
  name,
  timeSegments,
  showNoEligibilityWarning,
  showIneligibleWarning,
  isHighlighted = false,
  isViolation = false,
  isDragging = false,
  isDragFocus = false,
  className,
  draggable,
  onDragStart,
  onDragEnd,
  onClick,
}: AssignmentPillProps) {
  const hasDragOverlay = Boolean(draggable || onDragStart || onDragEnd);
  const handleRootDragStart: DragEventHandler<HTMLDivElement> | undefined =
    hasDragOverlay
      ? (event) => {
          if (event.target !== event.currentTarget) return;
          onDragStart?.(event);
        }
      : undefined;
  const handleRootDragEnd: DragEventHandler<HTMLDivElement> | undefined =
    hasDragOverlay
      ? (event) => {
          if (event.target !== event.currentTarget) return;
          onDragEnd?.(event);
        }
      : undefined;
  const showHighlight = isHighlighted && !isDragging;
  const showViolation = isViolation && !isDragging;
  const showDragFocus = isDragFocus;
  const hasWarning = showNoEligibilityWarning || showIneligibleWarning;
  const hasSegments = Boolean(timeSegments?.length);
  const segmentFreeClass = showViolation
    ? "bg-rose-100/80 dark:bg-rose-900/40"
    : showDragFocus
      ? "bg-sky-200 dark:bg-sky-700/60"
      : showHighlight
        ? "bg-emerald-100/80 dark:bg-emerald-900/40"
        : "bg-sky-50 dark:bg-sky-900/40";
  const segmentTakenClass = "bg-white dark:bg-slate-900";
  const toneClass = showViolation
    ? "border-2 border-rose-300 text-rose-900 dark:border-rose-500/60 dark:text-rose-100"
    : showDragFocus
      ? "border-2 border-slate-900 text-slate-900 dark:border-slate-100 dark:text-sky-50"
      : showHighlight
        ? "border-2 border-emerald-300 text-emerald-900 dark:border-emerald-500/60 dark:text-emerald-100"
        : "border-sky-200 text-sky-800 dark:border-sky-500/40 dark:text-sky-100";
  const toneBgClass = showViolation
    ? "bg-rose-100/80 dark:bg-rose-900/40"
    : showDragFocus
      ? "bg-sky-200 dark:bg-sky-700/60"
      : showHighlight
        ? "bg-emerald-100/80 dark:bg-emerald-900/40"
        : "bg-sky-50 dark:bg-sky-900/40";
  return (
    <div
      data-assignment-pill="true"
      draggable={draggable}
      onDragStart={handleRootDragStart}
      onDragEnd={handleRootDragEnd}
      onClick={onClick}
      className={cx(
        "group/pill relative w-full select-none overflow-visible rounded-xl border px-1.5 py-0.5 text-[11px] font-normal leading-4 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.7)]",
        "transition-colors hover:z-[500]",
        hasWarning ? "z-[500]" : "z-[1]",
        toneClass,
        hasSegments ? "bg-transparent" : toneBgClass,
        !hasSegments &&
          (showViolation
            ? "hover:border-rose-300 hover:bg-rose-100/80 dark:hover:border-rose-500/60 dark:hover:bg-rose-900/40"
            : showDragFocus
              ? "hover:border-slate-900 hover:bg-sky-200"
              : showHighlight
                ? "hover:border-emerald-300 hover:bg-emerald-100/80 dark:hover:border-emerald-500/60 dark:hover:bg-emerald-900/40"
                : "hover:border-sky-300 hover:bg-sky-100 dark:hover:border-sky-400/60 dark:hover:bg-sky-900/60"),
        className,
      )}
    >
      {hasDragOverlay ? (
        <div
          aria-hidden="true"
          className={cx(
            "absolute inset-0 z-[120] rounded-[inherit]",
            draggable && "cursor-grab active:cursor-grabbing",
          )}
          draggable={draggable}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
        />
      ) : null}
      <div className="relative z-10 overflow-hidden rounded-[inherit]">
        {hasSegments ? (
          <div className="pointer-events-none absolute inset-0 z-0 flex divide-x divide-slate-200/80 dark:divide-slate-700/80">
            {timeSegments?.map((segment, index) => (
              <div
                key={`${segment.label}-${index}`}
                className={cx(
                  "flex-1",
                  segment.kind === "taken" ? segmentTakenClass : segmentFreeClass,
                )}
              />
            ))}
          </div>
        ) : null}
        <div className="relative z-10 flex flex-col items-center gap-0.5">
          <div className="flex items-center justify-center gap-1 truncate">
            <span className="truncate text-center">{name}</span>
          </div>
        </div>
      </div>
      {showNoEligibilityWarning ? (
        <span className="group/warn pointer-events-auto absolute right-1 top-0 z-[200] -translate-y-1/2">
          <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-rose-300 text-[10px] font-semibold text-rose-700 shadow-sm">
            !
          </span>
          <span className="pointer-events-none absolute right-0 top-full z-[210] mt-1 w-max rounded-md border border-slate-200 bg-white px-2 py-1 text-[10px] font-semibold text-slate-600 opacity-0 shadow-sm transition-opacity duration-75 group-hover/warn:opacity-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
            No eligible sections defined yet.
          </span>
        </span>
      ) : showIneligibleWarning ? (
        <span className="group/warn pointer-events-auto absolute right-1 top-0 z-[200] -translate-y-1/2">
          <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-amber-200 text-[10px] font-semibold text-amber-700 shadow-sm">
            !
          </span>
          <span className="pointer-events-none absolute right-0 top-full z-[210] mt-1 w-max rounded-md border border-slate-200 bg-white px-2 py-1 text-[10px] font-semibold text-slate-600 opacity-0 shadow-sm transition-opacity duration-75 group-hover/warn:opacity-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
            Not eligible for this slot.
          </span>
        </span>
      ) : null}
    </div>
  );
}
