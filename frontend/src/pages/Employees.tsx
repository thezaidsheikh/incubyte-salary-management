import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, type Employee, type PageMeta } from "../api/api";
import { formatMoney } from "../utils/format";

const DEPARTMENTS = ["Engineering", "Product", "Design", "Sales", "Marketing", "HR", "Finance", "Operations", "Data", "Support"];
const COUNTRIES = ["India", "USA", "UK", "Germany", "Singapore", "Canada", "Australia", "UAE"];
const LEVELS = ["Junior", "Mid", "Senior", "Lead", "Manager", "Director"];

export default function Employees() {
  const [rows, setRows] = useState<Employee[]>([]);
  const [meta, setMeta] = useState<PageMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState("");
  const [country, setCountry] = useState("");
  const [level, setLevel] = useState("");
  const [sortBy, setSortBy] = useState("lastName");
  const [sortOrder, setSortOrder] = useState("asc");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const t = setTimeout(() => {
      setLoading(true);
      const params: Record<string, string | number> = { page, pageSize: 20, sortBy, sortOrder };
      if (search) params.search = search;
      if (department) params.department = department;
      if (country) params.country = country;
      if (level) params.level = level;
      api.listEmployees(params)
        .then(({ data, meta: m }) => { setRows(data); setMeta(m); setError(""); })
        .catch((e: Error) => setError(e.message))
        .finally(() => setLoading(false));
    }, 250); // debounce search so every keystroke is not a request
    return () => clearTimeout(t);
  }, [search, department, country, level, sortBy, sortOrder, page]);

  const resetPage = (fn: (v: string) => void) => (v: string) => { setPage(1); fn(v); };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Employees {meta && <span className="text-base font-normal text-slate-500">({meta.total.toLocaleString()})</span>}</h1>
        <a className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white" href={api.exportUrl({ ...(search ? { search } : {}), ...(department ? { department } : {}), ...(country ? { country } : {}), ...(level ? { level } : {}), format: "csv" })}>Export CSV</a>
      </div>
      <div className="flex flex-wrap gap-2">
        <input className="rounded-lg border px-3 py-2 text-sm" placeholder="Search name or email…" value={search} onChange={(e) => resetPage(setSearch)(e.target.value)} />
        <select className="rounded-lg border px-2 py-2 text-sm" value={department} onChange={(e) => resetPage(setDepartment)(e.target.value)}><option value="">All departments</option>{DEPARTMENTS.map((d) => <option key={d}>{d}</option>)}</select>
        <select className="rounded-lg border px-2 py-2 text-sm" value={country} onChange={(e) => resetPage(setCountry)(e.target.value)}><option value="">All countries</option>{COUNTRIES.map((d) => <option key={d}>{d}</option>)}</select>
        <select className="rounded-lg border px-2 py-2 text-sm" value={level} onChange={(e) => resetPage(setLevel)(e.target.value)}><option value="">All levels</option>{LEVELS.map((d) => <option key={d}>{d}</option>)}</select>
        <select className="rounded-lg border px-2 py-2 text-sm" value={sortBy} onChange={(e) => setSortBy(e.target.value)}><option value="lastName">Sort: name</option><option value="baseSalary">Sort: salary</option><option value="dateOfJoining">Sort: joining date</option></select>
        <select className="rounded-lg border px-2 py-2 text-sm" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)}><option value="asc">Ascending</option><option value="desc">Descending</option></select>
      </div>
      {error && <div className="rounded border border-red-200 bg-red-50 p-4 text-red-700">Could not load employees: {error}. Is the backend running?</div>}
      {loading ? <p className="text-slate-500">Loading…</p> : rows.length === 0 ? <p className="rounded border bg-white p-6 text-center text-slate-500">No employees match these filters.</p> : (
        <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead><tr className="border-b text-left text-slate-500"><th className="px-3 py-2">Name</th><th>Department</th><th>Country</th><th>Level</th><th className="text-right">Salary / month</th></tr></thead>
            <tbody>{rows.map((e) => (<tr key={e.id} className="border-t hover:bg-slate-50"><td className="px-3 py-2"><Link className="font-medium text-indigo-700" to={`/employees/${e.id}`}>{e.firstName} {e.lastName}</Link><div className="text-xs text-slate-500">{e.email}</div></td><td>{e.department}</td><td>{e.country}</td><td>{e.level}</td><td className="text-right">{formatMoney(e.baseSalary, e.currency)}</td></tr>))}</tbody>
          </table>
        </div>
      )}
      {meta && (
        <div className="flex items-center justify-between text-sm">
          <span>Page {meta.page} of {meta.totalPages} · {meta.total.toLocaleString()} employees</span>
          <div className="flex gap-2">
            <button className="rounded border bg-white px-3 py-1 disabled:opacity-40" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
            <button className="rounded border bg-white px-3 py-1 disabled:opacity-40" disabled={page >= meta.totalPages} onClick={() => setPage(page + 1)}>Next</button>
          </div>
        </div>
      )}
    </div>
  );
}
