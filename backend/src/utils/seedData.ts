// Deterministic seed data generation — pure, no DB, no I/O.
// Same (count, seed) => same employees, every time. That is what makes
// the seed repeatable and the determinism test possible.
// Salary formula: monthly USD band per level × country FX rate × cost
// factor. Example: Senior in India = 4500–7500 USD × 83 × 0.35 ≈
export function mulberry32(seed: number) {
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
const LEVEL_WEIGHTS = [0.22, 0.3, 0.25, 0.1, 0.08, 0.05]; // Junior..Director

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

function pickWeighted(rng: () => number, weights: number[]): number {
  let r = rng();
  for (let i = 0; i < weights.length; i++) {
    if (r < weights[i]) return i;
    r -= weights[i];
  }
  return weights.length - 1;
}

export function generateEmployees(count: number, seed = 42): SeedEmployee[] {
  const rng = mulberry32(seed);
  const usedEmails = new Map<string, number>();
  const ids: string[] = []; // placeholder ids for manager links (index-based)
  const employees: SeedEmployee[] = [];

  for (let i = 0; i < count; i++) {
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
    const managerId = i > 500 && rng() < 0.85 ? ids[Math.floor(rng() * 500)] : null;
    ids.push(`emp-${i}`);
    employees.push({
      firstName, lastName, email, department, country: country.name, currency: country.currency,
      jobTitle, level, managerId, dateOfJoining: new Date(Date.UTC(year, month, day)),
      employmentStatus: "Active", baseSalary,
    });
  }
  return employees;
}
