import { createPortal } from "react-dom";
import type { PreferredWorkingTimes } from "../../api/client";
import { cx } from "../../lib/classNames";
import ClinicianEditor from "./ClinicianEditor";

type ClinicianEditModalProps = {
  open: boolean;
  onClose: () => void;
  clinician: {
    id: string;
    name: string;
    qualifiedClassIds: string[];
    vacations: Array<{ id: string; startISO: string; endISO: string }>;
    preferredWorkingTimes?: PreferredWorkingTimes;
    workingHoursPerWeek?: number;
  } | null;
  classRows: Array<{ id: string; name: string }>;
  onToggleQualification: (clinicianId: string, classId: string) => void;
  onReorderQualification: (
    clinicianId: string,
    fromClassId: string,
    toClassId: string,
  ) => void;
  onUpdateWorkingHours: (clinicianId: string, workingHoursPerWeek?: number) => void;
  onUpdatePreferredWorkingTimes: (
    clinicianId: string,
    preferredWorkingTimes: PreferredWorkingTimes,
  ) => void;
  onAddVacation: (clinicianId: string) => void;
  onUpdateVacation: (
    clinicianId: string,
    vacationId: string,
    updates: { startISO?: string; endISO?: string },
  ) => void;
  onRemoveVacation: (clinicianId: string, vacationId: string) => void;
  initialSection?: "vacations";
};

export default function ClinicianEditModal({
  open,
  onClose,
  clinician,
  classRows,
  onToggleQualification,
  onReorderQualification,
  onUpdateWorkingHours,
  onUpdatePreferredWorkingTimes,
  onAddVacation,
  onUpdateVacation,
  onRemoveVacation,
  initialSection,
}: ClinicianEditModalProps) {
  if (!open || !clinician) return null;

  return createPortal(
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        className="absolute inset-0 cursor-default bg-slate-900/30 backdrop-blur-[1px] dark:bg-slate-950/50"
        onClick={onClose}
        aria-label="Close"
      />
      <div className="relative mx-auto mt-24 w-full max-w-2xl px-6">
        <div className="flex max-h-[80vh] flex-col rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900">
          <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5 dark:border-slate-800">
            <div>
              <div className="text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-100">
                Edit {clinician.name}
              </div>
              <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                Update eligible sections and vacations.
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className={cx(
                "rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900",
                "hover:bg-slate-50 active:bg-slate-100",
                "dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700",
              )}
            >
              Close
            </button>
          </div>
          <div className="min-h-0 overflow-y-auto px-6 py-5">
            <ClinicianEditor
              clinician={clinician}
              classRows={classRows}
              initialSection={initialSection}
              onUpdateWorkingHours={onUpdateWorkingHours}
              onUpdatePreferredWorkingTimes={onUpdatePreferredWorkingTimes}
              onToggleQualification={onToggleQualification}
              onReorderQualification={onReorderQualification}
              onAddVacation={onAddVacation}
              onUpdateVacation={onUpdateVacation}
              onRemoveVacation={onRemoveVacation}
            />
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
