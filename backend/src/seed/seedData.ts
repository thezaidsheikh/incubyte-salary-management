// Deterministic seed data generation — pure, no DB, no I/O.
// Same (count, seed) => same employees, every time. That is what makes
// the seed repeatable and the determinism test possible.
import { createSeedEmployee } from "./employeeFactory.js";

/**
 * mulberry32 — a tiny deterministic PRNG. Same seed => same sequence.
 * @param seed Seed value.
 * @returns A function returning a pseudo-random number in [0, 1).
 */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const DEPARTMENTS = [
  "Engineering",
  "Product",
  "Design",
  "Sales",
  "Marketing",
  "HR",
  "Finance",
  "Operations",
  "Data",
  "Support",
] as const;

export const COUNTRIES = [
  // currency, FX vs USD, cost factor (local pay vs US pay)
  { name: "India", currency: "INR", fx: 83, factor: 0.35 },
  { name: "USA", currency: "USD", fx: 1, factor: 1 },
  { name: "UK", currency: "GBP", fx: 0.79, factor: 0.85 },
  { name: "Germany", currency: "EUR", fx: 0.92, factor: 0.85 },
  { name: "Singapore", currency: "SGD", fx: 1.34, factor: 0.9 },
  { name: "Canada", currency: "CAD", fx: 1.36, factor: 0.85 },
  { name: "Australia", currency: "AUD", fx: 1.52, factor: 0.9 },
  { name: "UAE", currency: "AED", fx: 3.67, factor: 0.9 },
] as const;

export const LEVELS = ["Junior", "Mid", "Senior", "Lead", "Manager", "Director"] as const;
// Monthly USD band [min, max] per level.
export const LEVEL_BANDS_USD: Record<string, [number, number]> = {
  Junior: [1500, 2500],
  Mid: [2500, 4500],
  Senior: [4500, 7500],
  Lead: [7500, 10000],
  Manager: [9000, 13000],
  Director: [12000, 18000],
};

/** One generated employee, before the database assigns a real UUID. */
export interface SeedEmployee {
  firstName: string;
  lastName: string;
  email: string;
  department: string;
  country: string;
  currency: string;
  jobTitle: string;
  level: (typeof LEVELS)[number];
  managerId: string | null;
  dateOfJoining: Date;
  employmentStatus: "Active";
  baseSalary: number;
}

/**
 * Generate deterministic employees via the seed employee factory.
 * @param count How many employees to generate.
 * @param seed PRNG seed; 42 is the canonical seed used by the seed script.
 * @returns The generated employees, in order.
 */
export function generateEmployees(count: number, seed = 42): SeedEmployee[] {
  const rng = mulberry32(seed);
  const usedEmails = new Map<string, number>();
  const managerIds: string[] = [];
  const employees: SeedEmployee[] = [];
  for (let i = 0; i < count; i++) {
    employees.push(createSeedEmployee(rng, i, usedEmails, managerIds));
  }
  return employees;
}
