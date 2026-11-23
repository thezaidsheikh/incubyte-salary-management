import {
  COUNTRIES,
  DEPARTMENTS,
  LEVELS,
  LEVEL_BANDS_USD,
  type SeedEmployee,
} from "./seedData.js";

// Pattern: Factory — createSeedEmployee builds one deterministic employee
// from a random source. generateEmployees is just a loop over this
// factory, so the construction rules live in exactly one place and the
// RNG call order (which fixes the deterministic output) is visible here.

const TITLES: Record<string, string[]> = {
  Engineering: ["Software Engineer", "Backend Engineer", "Frontend Engineer", "DevOps Engineer", "QA Engineer"],
  Product: ["Product Manager", "Product Analyst", "Product Owner"],
  Design: ["Product Designer", "UX Designer", "UI Designer"],
  Sales: ["Account Executive", "Sales Manager", "Business Development Rep"],
  Marketing: ["Marketing Manager", "Content Strategist", "Growth Marketer"],
  HR: ["HR Business Partner", "Recruiter", "People Operations Manager"],
  Finance: ["Financial Analyst", "Accountant", "Finance Manager"],
  Operations: ["Operations Manager", "Operations Analyst", "Program Manager"],
  Data: ["Data Analyst", "Data Engineer", "Data Scientist"],
  Support: ["Support Engineer", "Customer Success Manager", "Support Lead"],
};

const FIRST = ["Aarav", "Priya", "Rahul", "Sneha", "Arjun", "Ananya", "Vikram", "Kavya", "Rohan", "Meera", "Aditya", "Isha", "Karan", "Nisha", "Sanjay", "Pooja", "Amit", "Divya", "Neha", "Varun", "Emma", "Liam", "Olivia", "Noah", "Sophia", "James", "Mia", "Lucas", "Amelia", "Ethan", "Charlotte", "Mason", "Harper", "Logan", "Ella", "Aisha", "Omar", "Fatima", "Yuki", "Kenji", "Sofia", "Mateo", "Lena", "Jonas", "Clara", "Felix", "Hannah", "Lukas", "Zara", "Ravi", "Tara", "Nikhil", "Anita", "Dev", "Riya", "Kabir", "Sara", "Imran", "Layla", "Chen", "Mei", "Diego", "Lucia", "Marco", "Elena", "Tom", "Grace", "Ben", "Chloe", "Sam", "Nina"];
const LAST = ["Sharma", "Patel", "Khan", "Singh", "Gupta", "Mehta", "Iyer", "Nair", "Reddy", "Das", "Smith", "Johnson", "Brown", "Taylor", "Miller", "Wilson", "Moore", "Anderson", "Thomas", "Jackson", "Garcia", "Martinez", "Lee", "Kim", "Chen", "Wang", "Nguyen", "Ali", "Ahmed", "Hassan", "Muller", "Schmidt", "Fischer", "Weber", "Meyer", "Wagner", "Silva", "Santos", "Costa", "Rossi", "Ferrari", "Kaur", "Verma", "Joshi", "Chopra", "Malhotra", "Kapoor", "Bhatt", "Trivedi", "Menon", "Pillai"];

/** Level weights, Junior..Director — most staff are Junior/Mid/Senior. */
const LEVEL_WEIGHTS = [0.22, 0.3, 0.25, 0.1, 0.08, 0.05];

/**
 * Pick a weighted index with a single RNG draw.
 * @param rng Random source returning [0, 1).
 * @param weights Weights that sum to 1.
 * @returns The chosen index (last index when rounding leaves a remainder).
 */
function pickWeighted(rng: () => number, weights: number[]): number {
  let r = rng();
  for (let i = 0; i < weights.length; i++) {
    if (r < weights[i]) return i;
    r -= weights[i];
  }
  return weights.length - 1;
}

/**
 * Build one deterministic seed employee.
 * RNG call order is fixed (name, department, country, level, title,
 * salary, joining date, manager) — changing it changes every seeded
 * employee, so the determinism test guards this function.
 * Salary formula: monthly USD band per level x country FX rate x cost
 * factor. Example: Senior in India = 4500–7500 USD x 83 x 0.35.
 * @param rng Random source returning [0, 1).
 * @param index Position in the seed run; also the employee's placeholder id.
 * @param usedEmails Counts per `first.last` base, for unique email suffixes.
 * @param managerIds Placeholder ids of earlier employees, for manager links.
 * @returns The built employee; also appends its placeholder id to managerIds.
 */
export function createSeedEmployee(
  rng: () => number,
  index: number,
  usedEmails: Map<string, number>,
  managerIds: string[],
): SeedEmployee {
  const firstName = FIRST[Math.floor(rng() * FIRST.length)];
  const lastName = LAST[Math.floor(rng() * LAST.length)];
  const base = `${firstName.toLowerCase()}.${lastName.toLowerCase()}`;
  const n = (usedEmails.get(base) ?? 0) + 1;
  usedEmails.set(base, n);
  const email = n === 1 ? `${base}@acme.com` : `${base}${n}@acme.com`;

  const department = DEPARTMENTS[Math.floor(rng() * DEPARTMENTS.length)];
  const country = COUNTRIES[Math.floor(rng() * COUNTRIES.length)];
  const level = LEVELS[pickWeighted(rng, LEVEL_WEIGHTS)];
  const titles = TITLES[department];
  const jobTitle = titles[Math.floor(rng() * titles.length)];
  const [lo, hi] = LEVEL_BANDS_USD[level];
  // Round to nearest 100 in local currency for realistic-looking pay.
  const baseSalary = Math.round((((lo + rng() * (hi - lo)) * country.fx * country.factor) / 100)) * 100;
  const year = 2015 + Math.floor(rng() * 12);
  const month = Math.floor(rng() * 12);
  const day = 1 + Math.floor(rng() * 28);
  // Manager: one of the first 500 employees (senior staff), 85% have one.
  const managerId = index > 500 && rng() < 0.85 ? managerIds[Math.floor(rng() * 500)] : null;
  managerIds.push(`emp-${index}`);
  return {
    firstName,
    lastName,
    email,
    department,
    country: country.name,
    currency: country.currency,
    jobTitle,
    level,
    managerId,
    dateOfJoining: new Date(Date.UTC(year, month, day)),
    employmentStatus: "Active",
    baseSalary,
  };
}
