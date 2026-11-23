"use client";

import { useEffect, useState } from "react";
import { api, type Analytics } from "@/features/employees/api";
import StatCard from "@/shared/components/StatCard";
import BarList from "@/shared/components/BarList";
import { formatMoney } from "@/shared/utils/format";

/**
 * Dashboard page: headcount and FX-normalised average/median salary, payroll
 * broken down by currency, department, country and level, the salary
 * distribution, the top 10 earners and outliers over 2× department median.
 * Fetches the analytics summary from the backend at runtime; shows a loading
 * line until it arrives and an error banner when the backend is unreachable.
 */
export default function DashboardPage() {
  const [a, setA] = useState<Analytics | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    api
      .analytics()
      .then(setA)
      .catch((e: Error) => setError(e.message));
  }, []);
  if (error)
    return (
      <div className="rounded border border-red-200 bg-red-50 p-4 text-red-700">
        Could not load analytics: {error}. Is the backend running?
      </div>
    );
  if (!a) return <div className="text-slate-500">Loading analytics…</div>;
  const topCurrency = a.payrollByCurrency[0];
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">How ACME pays people</h1>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Headcount" value={a.totalEmployees.toLocaleString()} sub="Active employees" />
        <StatCard label="Average salary (USD)" value={`$${a.averageSalaryUsd.toLocaleString()}`} sub="per month, FX-normalised" />
        <StatCard label="Median salary (USD)" value={`$${a.medianSalaryUsd.toLocaleString()}`} sub="per month, FX-normalised" />
        <StatCard
          label="Largest payroll"
          value={topCurrency ? formatMoney(topCurrency.total, topCurrency.currency) : "—"}
          sub={topCurrency ? `${topCurrency.currency} · ${topCurrency.count} people / month` : ""}
        />
      </div>
      <section className="rounded-xl border bg-white p-4 shadow-sm">
        <h2 className="mb-3 font-semibold">Payroll by currency (per month, local currency)</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-slate-500">
              <th>Currency</th>
              <th>People</th>
              <th>Total</th>
              <th>Average</th>
              <th>Median</th>
            </tr>
          </thead>
          <tbody>
            {a.payrollByCurrency.map((r) => (
              <tr key={r.currency} className="border-t">
                <td className="py-1 font-medium">{r.currency}</td>
                <td>{r.count}</td>
                <td>{formatMoney(r.total, r.currency)}</td>
                <td>{formatMoney(r.average, r.currency)}</td>
                <td>{formatMoney(r.median, r.currency)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-2 text-xs text-slate-500">
          Currencies are never summed together — that would mix INR with USD. USD figures use fixed FX rates, for
          comparison only.
        </p>
      </section>
      <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded-xl border bg-white p-4 shadow-sm">
          <h2 className="mb-3 font-semibold">By department</h2>
          <BarList rows={a.byDepartment} valueLabel="avg" />
        </section>
        <section className="rounded-xl border bg-white p-4 shadow-sm">
          <h2 className="mb-3 font-semibold">By country</h2>
          <BarList rows={a.byCountry} valueLabel="avg" />
        </section>
        <section className="rounded-xl border bg-white p-4 shadow-sm">
          <h2 className="mb-3 font-semibold">By level</h2>
          <BarList rows={a.byLevel} valueLabel="avg" />
        </section>
        <section className="rounded-xl border bg-white p-4 shadow-sm">
          <h2 className="mb-3 font-semibold">Salary distribution (USD / month)</h2>
          <div className="space-y-2">
            {a.distributionUsd.map((d) => (
              <div key={d.bucket} className="grid grid-cols-[8rem_1fr_4rem] items-center gap-2 text-sm">
                <span>{d.bucket}</span>
                <div className="h-3 rounded bg-slate-100">
                  <div
                    className="h-3 rounded bg-emerald-600"
                    style={{ width: `${(d.count / Math.max(1, a.totalEmployees)) * 100}%` }}
                  />
                </div>
                <span className="text-right">{d.count}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded-xl border bg-white p-4 shadow-sm">
          <h2 className="mb-3 font-semibold">Top 10 earners (USD-normalised)</h2>
          <table className="w-full text-sm">
            <tbody>
              {a.topEarners.map((e) => (
                <tr key={e.name + e.usd} className="border-t">
                  <td className="py-1 font-medium">{e.name}</td>
                  <td>{e.jobTitle}</td>
                  <td className="text-right">{formatMoney(e.baseSalary, e.currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
        <section className="rounded-xl border bg-white p-4 shadow-sm">
          <h2 className="mb-3 font-semibold">Outliers — over 2× department median</h2>
          {a.outliers.length === 0 ? (
            <p className="text-sm text-slate-500">No outliers right now.</p>
          ) : (
            <table className="w-full text-sm">
              <tbody>
                {a.outliers.map((e) => (
                  <tr key={e.name} className="border-t">
                    <td className="py-1 font-medium">{e.name}</td>
                    <td>{e.department}</td>
                    <td className="text-right">
                      ${e.usd.toLocaleString()} vs median ${e.departmentMedianUsd.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </div>
  );
}
