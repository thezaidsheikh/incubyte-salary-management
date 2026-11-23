import { Link, NavLink, Route, Routes } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import Employees from "./pages/Employees";
import EmployeeDetail from "./pages/EmployeeDetail";
import AddEmployee from "./pages/AddEmployee";

export default function App() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link to="/" className="text-lg font-bold">ACME · Salary Management</Link>
          <nav className="flex gap-4 text-sm">
            <NavLink to="/" end className={({ isActive }) => isActive ? "font-semibold text-indigo-700" : "text-slate-600"}>Dashboard</NavLink>
            <NavLink to="/employees" className={({ isActive }) => isActive ? "font-semibold text-indigo-700" : "text-slate-600"}>Employees</NavLink>
            <NavLink to="/employees/new" className={({ isActive }) => isActive ? "font-semibold text-indigo-700" : "text-slate-600"}>Add Employee</NavLink>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/employees" element={<Employees />} />
          <Route path="/employees/new" element={<AddEmployee />} />
          <Route path="/employees/:id" element={<EmployeeDetail />} />
        </Routes>
      </main>
    </div>
  );
}
