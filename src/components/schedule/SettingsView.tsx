import { useState } from "react";
import { cx } from "../../lib/classNames";
import { WorkplaceRow } from "../../data/mockData";

type SettingsViewProps = {
  classRows: WorkplaceRow[];
  poolRows: WorkplaceRow[];
  minSlotsByRowId: Record<string, { weekday: number; weekend: number }>;
  clinicians: Array<{ id: string; name: string }>;
  onChangeMinSlots: (
    rowId: string,
    kind: "weekday" | "weekend",
    nextValue: number,
  ) => void;
  onRenameClass: (rowId: string, nextName: string) => void;
  onRemoveClass: (rowId: string) => void;
  onAddClass: () => void;
  onReorderClass: (fromId: string, toId: string) => void;
  onRenamePool: (rowId: string, nextName: string) => void;
  onAddClinician: (name: string) => void;
  onEditClinician: (clinicianId: string) => void;
  onRemoveClinician: (clinicianId: string) => void;
};

export default function SettingsView({
  classRows,
  poolRows,
  minSlotsByRowId,
  clinicians,
  onChangeMinSlots,
  onRenameClass,
  onRemoveClass,
  onAddClass,
  onReorderClass,
  onRenamePool,
  onAddClinician,
  onEditClinician,
  onRemoveClinician,
}: SettingsViewProps) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [newClinicianName, setNewClinicianName] = useState("");
  const poolNoteById: Record<string, string> = {
    "pool-not-allocated": "Pool from which clinicians are distributed to workplaces.",
    "pool-manual": "Pool of clinicians that will not be automatically distributed.",
    "pool-vacation":
      "Clinicians on vacations. Drag in or out of this row to update vacations.",
  };

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="flex items-start justify-between gap-6">
          <div>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
              Settings
            </h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              Define minimum required slots per class (weekday vs weekend/holiday).
            </p>
          </div>
          <button
            type="button"
            onClick={onAddClass}
            className={cx(
              "inline-flex items-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900 shadow-sm",
              "hover:bg-slate-50 active:bg-slate-100",
              "dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700",
            )}
          >
            Add Class
          </button>
        </div>

        <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
          <div className="grid grid-cols-[auto_2fr_1fr_1fr_auto] bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            <div>Priority</div>
            <div>Class</div>
            <div>Min Slots (Weekday)</div>
            <div>Min Slots (Weekend)</div>
            <div className="text-right">Actions</div>
          </div>
          <div className="divide-y divide-slate-200 dark:divide-slate-800">
            {classRows.map((row, index) => (
              <div
                key={row.id}
                className={cx(
                  "grid grid-cols-[auto_2fr_1fr_1fr_auto] items-center gap-3 px-4 py-3 dark:bg-slate-900/70",
                  dragOverId === row.id && "bg-sky-50",
                )}
                onDragOver={(event) => {
                  if (!draggingId) return;
                  if (draggingId === row.id) return;
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
                  onReorderClass(fromId, row.id);
                  setDraggingId(null);
                  setDragOverId(null);
                }}
              >
                <div className="flex items-center gap-3">
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
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
                    className="cursor-grab rounded-lg border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                    aria-label={`Reorder ${row.name}`}
                  >
                    ≡
                  </button>
                </div>
                <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  <input
                    type="text"
                    value={row.name}
                    onChange={(e) => onRenameClass(row.id, e.target.value)}
                    className={cx(
                      "w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-900",
                      "focus:border-sky-300 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100",
                    )}
                  />
                </div>
                <div>
                  <input
                    type="number"
                    min={0}
                    value={minSlotsByRowId[row.id]?.weekday ?? 0}
                    onChange={(e) => {
                      const raw = Number(e.target.value);
                      onChangeMinSlots(
                        row.id,
                        "weekday",
                        Number.isFinite(raw) ? raw : 0,
                      );
                    }}
                    className={cx(
                      "w-28 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-900",
                      "focus:border-sky-300 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:[color-scheme:dark]",
                    )}
                  />
                </div>
                <div>
                  <input
                    type="number"
                    min={0}
                    value={minSlotsByRowId[row.id]?.weekend ?? 0}
                    onChange={(e) => {
                      const raw = Number(e.target.value);
                      onChangeMinSlots(
                        row.id,
                        "weekend",
                        Number.isFinite(raw) ? raw : 0,
                      );
                    }}
                    className={cx(
                      "w-28 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-900",
                      "focus:border-sky-300 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:[color-scheme:dark]",
                    )}
                  />
                </div>
                <div className="text-right">
                  <button
                    type="button"
                    onClick={() => onRemoveClass(row.id)}
                    className={cx(
                      "rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600",
                      "hover:bg-slate-50 hover:text-slate-900",
                      "dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800 dark:hover:text-slate-100",
                    )}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900/60">
          <div className="text-base font-semibold text-slate-900 dark:text-slate-100">Pools</div>
          <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            Rename pool rows (cannot be deleted).
          </div>
          <div className="mt-4 space-y-3">
            {poolRows.map((row) => (
              <div key={row.id} className="flex items-center gap-4">
                <input
                  type="text"
                  value={row.name}
                  onChange={(e) => onRenamePool(row.id, e.target.value)}
                  className={cx(
                    "w-full max-w-sm rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-900",
                    "focus:border-sky-300 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100",
                  )}
                />
                <span className="text-xs font-semibold text-slate-400 dark:text-slate-500">
                  {poolNoteById[row.id] ?? "Pool"}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900/60">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Clinicians
              </div>
              <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                Manage clinicians and open the same editor as in the calendar.
              </div>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <input
              type="text"
              value={newClinicianName}
              onChange={(e) => setNewClinicianName(e.target.value)}
              placeholder="New clinician name"
              className={cx(
                "w-full max-w-xs rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-900",
                "focus:border-sky-300 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100",
              )}
            />
            <button
              type="button"
              onClick={() => {
                const trimmed = newClinicianName.trim();
                if (!trimmed) return;
                onAddClinician(trimmed);
                setNewClinicianName("");
              }}
              className={cx(
                "rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900 shadow-sm",
                "hover:bg-slate-50 active:bg-slate-100",
                "dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700",
              )}
            >
              Add Clinician
            </button>
          </div>
          <div className="mt-5 divide-y divide-slate-200 rounded-xl border border-slate-200 dark:border-slate-800 dark:divide-slate-800">
            {clinicians.map((clinician) => (
              <div
                key={clinician.id}
                className="flex items-center justify-between gap-4 px-4 py-3 dark:bg-slate-900/70"
              >
                <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {clinician.name}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onEditClinician(clinician.id)}
                    className={cx(
                      "rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600",
                      "hover:bg-slate-50 hover:text-slate-900",
                      "dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800 dark:hover:text-slate-100",
                    )}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => onRemoveClinician(clinician.id)}
                    className={cx(
                      "rounded-xl border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-600",
                      "hover:bg-rose-50 hover:text-rose-700",
                      "dark:border-rose-500/40 dark:text-rose-200 dark:hover:bg-rose-900/30",
                    )}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
