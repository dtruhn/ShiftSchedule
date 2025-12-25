import { createPortal } from "react-dom";
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
  } | null;
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

export default function ClinicianEditModal({
  open,
  onClose,
  clinician,
  classRows,
  onToggleQualification,
  onReorderQualification,
  onAddVacation,
  onUpdateVacation,
  onRemoveVacation,
}: ClinicianEditModalProps) {
  if (!open || !clinician) return null;

  return createPortal(
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        className="absolute inset-0 cursor-default bg-slate-900/30 backdrop-blur-[1px]"
        onClick={onClose}
        aria-label="Close"
      />
      <div className="relative mx-auto mt-24 w-full max-w-2xl px-6">
        <div className="flex max-h-[80vh] flex-col rounded-2xl border border-slate-200 bg-white shadow-xl">
          <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
            <div>
              <div className="text-lg font-semibold tracking-tight text-slate-900">
                Edit {clinician.name}
              </div>
              <div className="mt-1 text-sm text-slate-600">
                Update eligible classes and vacations.
              </div>
            </div>
            <button
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
          <div className="min-h-0 overflow-y-auto px-6 py-5">
            <ClinicianEditor
              clinician={clinician}
              classRows={classRows}
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
