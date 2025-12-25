import React, { useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { WorkplaceRow } from "../../data/mockData";
import { cx } from "../../lib/classNames";

type CellModalProps = {
  open: boolean;
  onClose: () => void;
  row: WorkplaceRow | null;
  date: Date | null;
  assigneeNames: string[];
};

export default function CellModal({
  open,
  onClose,
  row,
  date,
  assigneeNames,
}: CellModalProps) {
  const title = useMemo(() => {
    if (!row || !date) return "Details";
    const day = new Intl.DateTimeFormat("en-US", {
      weekday: "long",
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(date);
    return `${row.name} · ${day}`;
  }, [row, date]);

  const closeBtnRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    closeBtnRef.current?.focus();
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        className="absolute inset-0 cursor-default bg-slate-900/30 backdrop-blur-[1px]"
        onClick={onClose}
        aria-label="Close"
      />
      <div className="relative mx-auto mt-24 w-full max-w-lg px-6">
        <div
          role="dialog"
          aria-modal="true"
          aria-label={title}
          className="rounded-2xl border border-slate-200 bg-white shadow-xl"
        >
          <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
            <div>
              <div className="text-lg font-semibold tracking-tight text-slate-900">
                {title}
              </div>
              <div className="mt-1 text-sm text-slate-600">
                Cell details (mock)
              </div>
            </div>
            <button
              ref={closeBtnRef}
              type="button"
              onClick={onClose}
              className={cx(
                "rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900",
                "hover:bg-slate-50 active:bg-slate-100",
              )}
            >
              Close
            </button>
          </div>

          <div className="px-6 py-5">
            <div className="grid grid-cols-3 gap-3 text-sm">
              <div className="text-slate-500">Workplace</div>
              <div className="col-span-2 font-semibold text-slate-900">
                {row?.name ?? "—"}
              </div>

              <div className="text-slate-500">Assignee</div>
              <div className="col-span-2 font-semibold text-slate-900">
                {assigneeNames.length > 0 ? assigneeNames.join(", ") : "Unassigned"}
              </div>
            </div>

            <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
              Actions will be added later (no backend yet).
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
