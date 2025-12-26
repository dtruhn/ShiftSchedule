import { cx } from "../../lib/classNames";
import { formatRangeLabel } from "../../lib/date";
import { ChevronLeftIcon, ChevronRightIcon } from "./icons";

type WeekNavigatorProps = {
  rangeStart: Date;
  rangeEndInclusive: Date;
  onPrevWeek: () => void;
  onNextWeek: () => void;
  onToday: () => void;
  variant?: "page" | "card";
};

export default function WeekNavigator({
  rangeStart,
  rangeEndInclusive,
  onPrevWeek,
  onNextWeek,
  onToday,
  variant = "page",
}: WeekNavigatorProps) {
  const panel = (
    <div
      className={cx(
        "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between",
        variant === "page" &&
          "rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm dark:border-slate-700 dark:bg-slate-900",
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onPrevWeek}
          className={cx(
            "grid h-8 w-8 place-items-center rounded-full border border-slate-200/70 bg-white text-slate-600",
            "hover:bg-slate-50 active:bg-slate-100",
            "dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-300 dark:hover:bg-slate-800",
          )}
          aria-label="Previous week"
        >
          <ChevronLeftIcon className="h-4 w-4" />
        </button>
        <div className="min-w-[148px] text-center text-sm font-normal tracking-tight text-slate-700 dark:text-slate-200 sm:text-base">
          {formatRangeLabel(rangeStart, rangeEndInclusive)}
        </div>
        <button
          type="button"
          onClick={onNextWeek}
          className={cx(
            "grid h-8 w-8 place-items-center rounded-full border border-slate-200/70 bg-white text-slate-600",
            "hover:bg-slate-50 active:bg-slate-100",
            "dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-300 dark:hover:bg-slate-800",
          )}
          aria-label="Next week"
        >
          <ChevronRightIcon className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={onToday}
          className={cx(
            "h-8 rounded-full border border-slate-200/70 bg-white px-3.5 text-sm font-normal text-slate-700",
            "hover:bg-slate-50 active:bg-slate-100",
            "dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-200 dark:hover:bg-slate-800",
          )}
        >
          Today
        </button>
      </div>
    </div>
  );

  if (variant === "card") {
    return panel;
  }

  return <div className="mx-auto max-w-7xl px-6 pt-6">{panel}</div>;
}
