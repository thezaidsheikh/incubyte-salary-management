/**
 * Shared lookup lists — single source of truth for the dropdowns in the
 * Employees list filters and the Add Employee form (DRY: never duplicated).
 */

/** Departments an employee can belong to. */
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

/** Countries an employee can be based in, with their payroll currency. */
export const COUNTRIES: readonly { name: string; currency: string }[] = [
  { name: "India", currency: "INR" },
  { name: "USA", currency: "USD" },
  { name: "UK", currency: "GBP" },
  { name: "Germany", currency: "EUR" },
  { name: "Singapore", currency: "SGD" },
  { name: "Canada", currency: "CAD" },
  { name: "Australia", currency: "AUD" },
  { name: "UAE", currency: "AED" },
];

/** Seniority levels, from most junior to most senior. */
export const LEVELS = ["Junior", "Mid", "Senior", "Lead", "Manager", "Director"] as const;

/**
 * Looks up the payroll currency for a country name.
 * Falls back to INR (the ACME home currency) for unknown names.
 */
export function currencyForCountry(country: string): string {
  return COUNTRIES.find((c) => c.name === country)?.currency ?? "INR";
}
