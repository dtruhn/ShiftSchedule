import { cx } from "../../lib/classNames";

type EmptySlotPillProps = {
  label?: string;
  onRemove?: () => void;
  variant?: "default" | "ghost";
  showAddIcon?: boolean;
  className?: string;
};

export default function EmptySlotPill({
  label = "Needs filling",
  onRemove,
  variant = "default",
  showAddIcon = false,
  className,
}: EmptySlotPillProps) {
  return (
    <div
      className={cx(
        "group/empty relative w-full rounded-xl border border-dashed px-2 py-1 text-center text-[11px] font-semibold leading-4 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.7)]",
        variant === "ghost"
          ? "border-slate-200 bg-slate-50/60 text-slate-400"
          : "border-rose-200 bg-rose-50/60 text-rose-500",
        className,
      )}
    >
      {label}
      {showAddIcon ? (
        <span className="absolute right-1 top-0 -translate-y-1/2">
          <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-slate-200 text-[12px] font-semibold text-slate-600 shadow-sm">
            +
          </span>
        </span>
      ) : null}
      {onRemove ? (
        <span
          role="button"
          aria-label="Remove needs filling"
          onClick={(event) => {
            event.stopPropagation();
            onRemove();
          }}
          className={cx(
            "absolute right-1 top-0 -translate-y-1/2 cursor-pointer opacity-0 transition-opacity",
            "group-hover/empty:opacity-100",
          )}
        >
          <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-rose-200 text-[12px] font-semibold text-rose-700 shadow-sm">
            -
          </span>
        </span>
      ) : null}
    </div>
  );
}
