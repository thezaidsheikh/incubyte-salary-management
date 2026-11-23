/** Props for {@link StatCard}. */
export interface StatCardProps {
  /** Small grey label shown above the value. */
  label: string;
  /** The headline figure. */
  value: string;
  /** Optional supporting line shown below the value; omitted when empty. */
  sub?: string;
}

/**
 * A single dashboard statistic tile: label, big value, optional sub-line.
 */
export default function StatCard({ label, value, sub }: StatCardProps) {
  return (
    <div className="rounded-xl border bg-white p-4 shadow-sm">
      <div className="text-sm text-slate-500">{label}</div>
      <div className="mt-1 text-2xl font-bold text-slate-900">{value}</div>
      {sub && <div className="mt-1 text-xs text-slate-500">{sub}</div>}
    </div>
  );
}
