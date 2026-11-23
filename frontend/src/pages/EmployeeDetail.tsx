import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api, type Employee, type SalaryHistory } from "../api/api";
import { formatDate, formatMoney } from "../utils/format";

export default function EmployeeDetail() {
  const { id } = useParams();
  const [emp, setEmp] = useState<(Employee & { salaryHistory: SalaryHistory[] }) | null>(null);
  const [error, setError] = useState("");
  const [newSalary, setNewSalary] = useState("");
  const [reason, setReason] = useState("");
  const [formError, setFormError] = useState("");
  const [saved, setSaved] = useState("");

  const load = () => { if (id) api.getEmployee(id).then(setEmp).catch((e: Error) => setError(e.message)); };
  useEffect(load, [id]);

  if (error) return <div className="rounded border border-red-200 bg-red-50 p-4 text-red-700">{error}</div>;
  if (!emp) return <p className="text-slate-500">Loading…</p>;

  const submit = async () => {
    setFormError(""); setSaved("");
    const n = Number(newSalary);
    if (!Number.isInteger(n) || n <= 0) return setFormError("New salary must be a whole number greater than 0.");
    if (n === emp.baseSalary) return setFormError("New salary must differ from the current salary.");
    if (reason.trim().length < 3) return setFormError("A reason is required (at least 3 characters).");
    try {
      await api.updateSalary(emp.id, n, reason.trim());
      setSaved(`Salary updated from ${formatMoney(emp.baseSalary, emp.currency)} to ${formatMoney(n, emp.currency)}.`);
      setNewSalary(""); setReason(""); load();
    } catch (e) { setFormError(e instanceof Error ? e.message : "Update failed"); }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{emp.firstName} {emp.lastName}</h1>
        <p className="text-slate-500">{emp.jobTitle} · {emp.department} · {emp.country} · {emp.level}</p>
        <p className="text-sm text-slate-500">{emp.email} · Joined {formatDate(emp.dateOfJoining)} · {emp.employmentStatus}</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded-xl border bg-white p-4 shadow-sm">
          <h2 className="mb-3 font-semibold">Edit salary</h2>
          <p className="mb-3 text-sm">Current: <strong>{formatMoney(emp.baseSalary, emp.currency)}</strong> / month ({emp.currency})</p>
          <label className="block text-sm font-medium">New salary ({emp.currency})</label>
          <input className="mt-1 w-full rounded-lg border px-3 py-2" type="number" min={1} value={newSalary} onChange={(e) => setNewSalary(e.target.value)} placeholder="e.g. 165000" />
          <label className="mt-3 block text-sm font-medium">Reason (required)</label>
          <input className="mt-1 w-full rounded-lg border px-3 py-2" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Annual appraisal" />
          {formError && <p className="mt-2 text-sm text-red-600">{formError}</p>}
          {saved && <p className="mt-2 text-sm text-emerald-700">{saved}</p>}
          <button className="mt-3 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white" onClick={submit}>Save salary change</button>
          <p className="mt-2 text-xs text-slate-500">Every change is written to the salary history with the old value, new value, reason and time — nothing is overwritten silently.</p>
        </section>
        <section className="rounded-xl border bg-white p-4 shadow-sm">
          <h2 className="mb-3 font-semibold">Salary history</h2>
          {emp.salaryHistory.length === 0 ? <p className="text-sm text-slate-500">No changes yet — this is the starting salary from the seed.</p> : (
            <ul className="space-y-3">{emp.salaryHistory.map((h) => (
              <li key={h.id} className="border-l-2 border-indigo-300 pl-3 text-sm">
                <div>{formatMoney(h.oldSalary, h.currency)} → <strong>{formatMoney(h.newSalary, h.currency)}</strong></div>
                <div className="text-slate-500">{h.reason} · {h.changedBy} · {formatDate(h.changedAt)}</div>
              </li>))}</ul>)}
        </section>
      </div>
    </div>
  );
}
