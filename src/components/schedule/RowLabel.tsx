import { WorkplaceRow } from "../../data/mockData";
type RowLabelProps = {
  row: WorkplaceRow;
};

export default function RowLabel({ row }: RowLabelProps) {
  const showVacationNote = row.id === "pool-vacation";
  return (
    <div className="group relative flex h-full items-center px-3 sm:px-4">
      <span
        className="max-w-[16ch] truncate text-[11px] font-normal uppercase tracking-wide text-slate-600 dark:text-slate-300 sm:max-w-[20ch] sm:text-xs"
        title={row.name}
        style={{ fontFamily: '"Inter", ui-sans-serif, system-ui, sans-serif' }}
      >
        {row.name}
      </span>
      {showVacationNote ? (
        <div className="pointer-events-none absolute left-4 top-full z-30 mt-2 w-max max-w-[260px] rounded-md border border-slate-200 bg-white px-3 py-2 text-[11px] font-semibold text-slate-600 opacity-0 shadow-sm transition-opacity duration-75 group-hover:opacity-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
          Drag people in or out to update vacations automatically.
        </div>
      ) : null}
    </div>
  );
}
