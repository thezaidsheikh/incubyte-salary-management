import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Salary Management — ACME",
  description: "ACME employee salary management: headcount, payroll and salary history.",
};

/**
 * Root layout: header nav (Dashboard / Employees / Add Employee) plus the
 * main content container shared by every page.
 *
 * NOTE: every page below is a client component ('use client') that fetches
 * from the backend at runtime — same behaviour as the old Vite SPA (dynamic
 * HR data, no SSR data fetching).
 */
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900">
        <header className="border-b bg-white">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
            <Link href="/" className="text-lg font-bold">
              ACME · Salary Management
            </Link>
            <nav className="flex gap-4 text-sm">
              <Link href="/" className="text-slate-600 hover:text-indigo-700">
                Dashboard
              </Link>
              <Link href="/employees" className="text-slate-600 hover:text-indigo-700">
                Employees
              </Link>
              <Link href="/employees/new" className="text-slate-600 hover:text-indigo-700">
                Add Employee
              </Link>
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
