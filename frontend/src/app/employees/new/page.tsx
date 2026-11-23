"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/features/employees/api";
import { COUNTRIES, DEPARTMENTS, LEVELS, currencyForCountry } from "@/shared/lib/constants";

/**
 * Add Employee page: create form for a new employee. The payroll currency is
 * derived from the selected country (single source in shared constants).
 * On success it navigates to the new employee's detail page; validation
 * errors are shown inline and nothing is submitted until they pass.
 */
export default function AddEmployeePage() {
  const router = useRouter();
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    department: "Engineering",
    country: "India",
    jobTitle: "",
    level: "Junior",
    dateOfJoining: "2026-11-23",
    baseSalary: "",
  });
  const [error, setError] = useState("");
  const currency = currencyForCountry(form.country);
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  /** Validates the form, then creates the employee and navigates to their page. */
  const submit = async () => {
    setError("");
    const salary = Number(form.baseSalary);
    if (!form.firstName.trim() || !form.lastName.trim() || !form.jobTitle.trim())
      return setError("First name, last name and job title are required.");
    if (!/^\S+@\S+\.\S+$/.test(form.email)) return setError("Enter a valid email.");
    if (!Number.isInteger(salary) || salary <= 0)
      return setError("Base salary must be a whole number greater than 0.");
    try {
      const emp = await api.createEmployee({ ...form, currency, baseSalary: salary });
      router.push(`/employees/${emp.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create employee");
    }
  };

  const input = "w-full rounded-lg border px-3 py-2";
  return (
    <div className="max-w-xl space-y-4">
      <h1 className="text-2xl font-bold">Add employee</h1>
      <div className="grid grid-cols-2 gap-3">
        <input
          aria-label="First name"
          className={input}
          placeholder="First name"
          value={form.firstName}
          onChange={(e) => set("firstName", e.target.value)}
        />
        <input
          aria-label="Last name"
          className={input}
          placeholder="Last name"
          value={form.lastName}
          onChange={(e) => set("lastName", e.target.value)}
        />
        <input
          aria-label="Email"
          className={`${input} col-span-2`}
          placeholder="Email"
          value={form.email}
          onChange={(e) => set("email", e.target.value)}
        />
        <input
          aria-label="Job title"
          className={`${input} col-span-2`}
          placeholder="Job title"
          value={form.jobTitle}
          onChange={(e) => set("jobTitle", e.target.value)}
        />
        <select
          aria-label="Department"
          className={input}
          value={form.department}
          onChange={(e) => set("department", e.target.value)}
        >
          {DEPARTMENTS.map((d) => (
            <option key={d}>{d}</option>
          ))}
        </select>
        <select aria-label="Level" className={input} value={form.level} onChange={(e) => set("level", e.target.value)}>
          {LEVELS.map((d) => (
            <option key={d}>{d}</option>
          ))}
        </select>
        <select
          aria-label="Country"
          className={input}
          value={form.country}
          onChange={(e) => set("country", e.target.value)}
        >
          {COUNTRIES.map((c) => (
            <option key={c.name} value={c.name}>
              {c.name} ({c.currency})
            </option>
          ))}
        </select>
        <input
          aria-label="Date of joining"
          className={input}
          type="date"
          value={form.dateOfJoining}
          onChange={(e) => set("dateOfJoining", e.target.value)}
        />
        <input
          aria-label="Base salary"
          className={`${input} col-span-2`}
          type="number"
          min={1}
          placeholder={`Base salary / month (${currency})`}
          value={form.baseSalary}
          onChange={(e) => set("baseSalary", e.target.value)}
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white" onClick={submit}>
        Create employee
      </button>
    </div>
  );
}
