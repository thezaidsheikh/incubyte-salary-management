/** One row of a {@link BarList}: a group name, its headcount, and its average (USD). */
export interface BarListRow {
  name: string;
  count: number;
  averageUsd?: number;
  medianUsd?: number;
}

/** Props for {@link BarList}. */
export interface BarListProps {
  /** Rows to render; bars are scaled to the largest `count`. */
  rows: BarListRow[];
  /** Label for the average figure (e.g. `"avg"`). */
  valueLabel: string;
}

/**
 * Horizontal bar chart: one row per group, bar width proportional to headcount,
 * with the count and the labelled average shown on the right.
 */
export default function BarList({ rows, valueLabel }: BarListProps) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <div className="space-y-2">
      {rows.map((r) => (
        <div
          key={r.name}
          className="grid grid-cols-[10rem_1fr_8rem] items-center gap-2 text-sm"
        >
          <span className="truncate font-medium">{r.name}</span>
          <div className="h-3 rounded bg-slate-100">
            <div
              className="h-3 rounded bg-indigo-600"
              style={{ width: `${(r.count / max) * 100}%` }}
            />
          </div>
          <span className="text-right text-slate-600">
            {r.count} · {valueLabel} ${r.averageUsd?.toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  );
}
