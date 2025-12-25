import { cx } from "../../lib/classNames";

type TopBarProps = {
  openSlotsCount: number;
  viewMode: "calendar" | "settings";
  onToggleView: () => void;
};

export default function TopBar({
  openSlotsCount,
  viewMode,
  onToggleView,
}: TopBarProps) {
  return (
    <div className="relative border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Weekly Schedule
          </h1>
          {viewMode === "calendar" ? (
            <span className="inline-flex items-center rounded-full bg-rose-50 px-3 py-1 text-sm font-medium text-rose-600 ring-1 ring-inset ring-rose-200">
              {openSlotsCount} Open Slots
            </span>
          ) : null}
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onToggleView}
            className={cx(
              "inline-flex items-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900 shadow-sm",
              "hover:bg-slate-50 active:bg-slate-100",
            )}
          >
            {viewMode === "calendar" ? "Settings" : "Back to Schedule"}
          </button>
        </div>
      </div>
      <button
        type="button"
        aria-label="Account"
        className={cx(
          "absolute right-6 top-5 grid h-10 w-10 place-items-center rounded-full bg-sky-500 text-sm font-semibold text-white shadow-sm",
          "hover:bg-sky-600 active:bg-sky-700",
        )}
      >
        AD
      </button>
    </div>
  );
}
