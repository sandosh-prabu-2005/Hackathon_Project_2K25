import type { CrowdReportFilters, DisasterType, SeverityLevel } from "../types/crowd";

type Props = {
  value: CrowdReportFilters;
  onChange: (next: CrowdReportFilters) => void;
};

const disasterTypes: Array<DisasterType> = ["flood", "cyclone", "landslide", "earthquake", "fire", "other"];
const severities: Array<SeverityLevel> = ["low", "medium", "high", "critical"];

export function FiltersBar({ value, onChange }: Props) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">Filter Reports</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="text-sm font-medium text-slate-700">
          <span>Disaster Type</span>
          <select
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-sky-200 focus:ring-2"
            value={value.disaster_type ?? ""}
            onChange={(event) => onChange({ ...value, disaster_type: (event.target.value || undefined) as DisasterType | undefined })}
          >
            <option value="">All</option>
            {disasterTypes.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm font-medium text-slate-700">
          <span>Severity</span>
          <select
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-sky-200 focus:ring-2"
            value={value.severity ?? ""}
            onChange={(event) => onChange({ ...value, severity: (event.target.value || undefined) as SeverityLevel | undefined })}
          >
            <option value="">All</option>
            {severities.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
      </div>
    </section>
  );
}
