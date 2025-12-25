import { useState } from "react";
import { cx } from "../../lib/classNames";

type ClinicianEditorProps = {
  clinician: {
    id: string;
    name: string;
    qualifiedClassIds: string[];
    vacations: Array<{ id: string; startISO: string; endISO: string }>;
  };
  classRows: Array<{ id: string; name: string }>;
  onToggleQualification: (clinicianId: string, classId: string) => void;
  onReorderQualification: (
    clinicianId: string,
    fromClassId: string,
    toClassId: string,
  ) => void;
  onAddVacation: (clinicianId: string) => void;
  onUpdateVacation: (
    clinicianId: string,
    vacationId: string,
    updates: { startISO?: string; endISO?: string },
  ) => void;
  onRemoveVacation: (clinicianId: string, vacationId: string) => void;
};

export default function ClinicianEditor({
  clinician,
  classRows,
  onToggleQualification,
  onReorderQualification,
  onAddVacation,
  onUpdateVacation,
  onRemoveVacation,
}: ClinicianEditorProps) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const eligibleIds = clinician.qualifiedClassIds;
  const eligibleRows = eligibleIds
    .map((id) => classRows.find((row) => row.id === id))
    .filter((row): row is { id: string; name: string } => Boolean(row));
  const ineligibleRows = classRows.filter((row) => !eligibleIds.includes(row.id));
  const now = new Date();
  const todayISO = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  )
    .toISOString()
    .slice(0, 10);
  const sortedVacations = [...clinician.vacations].sort((a, b) =>
    a.startISO.localeCompare(b.startISO),
  );
  const pastVacations = sortedVacations.filter((v) => v.endISO < todayISO);
  const upcomingVacations = sortedVacations.filter((v) => v.endISO >= todayISO);

  return (
    <div>
      <div className="relative mt-4 rounded-2xl border-2 border-sky-200 bg-sky-50/60 px-4 py-4 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.8)]">
        <div className="absolute -top-3 left-4 rounded-full border border-sky-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-sky-600">
          Eligible Classes
        </div>
        <div className="text-sm font-semibold text-slate-700">
          Drag to set priority, toggle to add or remove.
        </div>
        <div className="mt-4 space-y-2">
          {eligibleRows.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-3 text-sm text-slate-500">
              No eligible classes selected yet.
            </div>
          ) : (
            eligibleRows.map((row, index) => (
              <div
                key={row.id}
                className={cx(
                  "flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700",
                  dragOverId === row.id && "border-sky-300 bg-sky-50",
                )}
                onDragOver={(event) => {
                  if (!draggingId || draggingId === row.id) return;
                  event.preventDefault();
                  setDragOverId(row.id);
                }}
                onDragLeave={() => {
                  setDragOverId((prev) => (prev === row.id ? null : prev));
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  const fromId =
                    draggingId || event.dataTransfer.getData("text/plain");
                  if (!fromId || fromId === row.id) {
                    setDragOverId(null);
                    return;
                  }
                  onReorderQualification(clinician.id, fromId, row.id);
                  setDraggingId(null);
                  setDragOverId(null);
                }}
              >
                <span className="text-xs font-semibold text-slate-400">
                  {index + 1}
                </span>
                <button
                  type="button"
                  draggable
                  onDragStart={(event) => {
                    event.dataTransfer.effectAllowed = "move";
                    event.dataTransfer.setData("text/plain", row.id);
                    setDraggingId(row.id);
                  }}
                  onDragEnd={() => {
                    setDraggingId(null);
                    setDragOverId(null);
                  }}
                  className="cursor-grab rounded-lg border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-500 hover:bg-slate-50"
                  aria-label={`Reorder ${row.name}`}
                >
                  ≡
                </button>
                <span className="flex-1 text-sm font-semibold text-slate-800">
                  {row.name}
                </span>
                <button
                  type="button"
                  onClick={() => onToggleQualification(clinician.id, row.id)}
                  className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Remove
                </button>
              </div>
            ))
          )}
        </div>
        {ineligibleRows.length > 0 ? (
          <div className="mt-4 rounded-2xl border border-slate-200 bg-white px-4 py-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Add eligible classes
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {ineligibleRows.map((row) => (
                <button
                  key={row.id}
                  type="button"
                  onClick={() => onToggleQualification(clinician.id, row.id)}
                  className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  {row.name}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      <div className="relative mt-6 rounded-2xl border-2 border-emerald-200 bg-emerald-50/60 px-4 py-4 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.8)]">
        <div className="absolute -top-3 left-4 rounded-full border border-emerald-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-600">
          Vacation
        </div>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold text-slate-700">Vacation periods</div>
            <div className="mt-1 text-sm text-slate-500">
              Define ranges to move the user into Vacation automatically.
            </div>
          </div>
          <button
            type="button"
            onClick={() => onAddVacation(clinician.id)}
            className={cx(
              "rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600",
              "hover:bg-slate-50 hover:text-slate-900",
            )}
          >
            Add Vacation
          </button>
        </div>

        <div className="mt-4 space-y-2">
          {upcomingVacations.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-4 text-sm text-slate-500">
              No upcoming vacations.
            </div>
          ) : (
            upcomingVacations.map((vacation) => (
              <div
                key={vacation.id}
                className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2"
              >
                <input
                  type="date"
                  value={vacation.startISO}
                  onChange={(e) =>
                    onUpdateVacation(clinician.id, vacation.id, {
                      startISO: e.target.value,
                    })
                  }
                  className={cx(
                    "rounded-lg border border-slate-200 px-2 py-1 text-xs font-medium text-slate-900",
                    "focus:border-sky-300",
                  )}
                />
                <span className="text-xs font-semibold text-slate-400">–</span>
                <input
                  type="date"
                  value={vacation.endISO}
                  onChange={(e) =>
                    onUpdateVacation(clinician.id, vacation.id, {
                      endISO: e.target.value,
                    })
                  }
                  className={cx(
                    "rounded-lg border border-slate-200 px-2 py-1 text-xs font-medium text-slate-900",
                    "focus:border-sky-300",
                  )}
                />
                <button
                  type="button"
                  onClick={() => onRemoveVacation(clinician.id, vacation.id)}
                  className={cx(
                    "ml-auto rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-600",
                    "hover:bg-slate-50 hover:text-slate-900",
                  )}
                >
                  Remove
                </button>
              </div>
            ))
          )}
        </div>

        {pastVacations.length > 0 ? (
          <details className="mt-4 rounded-2xl border border-slate-200 bg-white px-4 py-3">
            <summary className="cursor-pointer text-sm font-semibold text-slate-700">
              Past vacations ({pastVacations.length})
            </summary>
            <div className="mt-2 text-sm text-slate-500">
              Past vacations are hidden by default. Expand to view or edit.
            </div>
            <div className="mt-3 space-y-2">
              {pastVacations.map((vacation) => (
                <div
                  key={vacation.id}
                  className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2"
                >
                  <input
                    type="date"
                    value={vacation.startISO}
                    onChange={(e) =>
                      onUpdateVacation(clinician.id, vacation.id, {
                        startISO: e.target.value,
                      })
                    }
                    className={cx(
                      "rounded-lg border border-slate-200 px-2 py-1 text-xs font-medium text-slate-900",
                      "focus:border-sky-300",
                    )}
                  />
                  <span className="text-xs font-semibold text-slate-400">–</span>
                  <input
                    type="date"
                    value={vacation.endISO}
                    onChange={(e) =>
                      onUpdateVacation(clinician.id, vacation.id, {
                        endISO: e.target.value,
                      })
                    }
                    className={cx(
                      "rounded-lg border border-slate-200 px-2 py-1 text-xs font-medium text-slate-900",
                      "focus:border-sky-300",
                    )}
                  />
                  <button
                    type="button"
                    onClick={() => onRemoveVacation(clinician.id, vacation.id)}
                    className={cx(
                      "ml-auto rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-600",
                      "hover:bg-slate-50 hover:text-slate-900",
                    )}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </details>
        ) : null}
      </div>
    </div>
  );
}
