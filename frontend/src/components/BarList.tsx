export default function BarList({ rows, valueLabel }: { rows: { name: string; count: number; averageUsd?: number; medianUsd?: number }[]; valueLabel: string }) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <div className="space-y-2">
      {rows.map((r) => (
        <div key={r.name} className="grid grid-cols-[10rem_1fr_8rem] items-center gap-2 text-sm">
          <span className="truncate font-medium">{r.name}</span>
          <div className="h-3 rounded bg-slate-100"><div className="h-3 rounded bg-indigo-600" style={{ width: `${(r.count / max) * 100}%` }} /></div>
          <span className="text-right text-slate-600">{r.count} · {valueLabel} ${r.averageUsd?.toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
}
