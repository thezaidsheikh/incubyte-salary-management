import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import DashboardPage from "./page";
import { api, type Analytics } from "@/features/employees/api";

// Mock only the analytics call; the rest of the client stays real.
vi.mock("@/features/employees/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/features/employees/api")>();
  return { ...actual, api: { ...actual.api, analytics: vi.fn() } };
});

const analyticsMock = vi.mocked(api.analytics);

/** Full analytics fixture; override any field per test. */
function makeAnalytics(overrides: Partial<Analytics> = {}): Analytics {
  return {
    totalEmployees: 10000,
    payrollByCurrency: [
      { currency: "INR", count: 6000, total: 900000000, average: 150000, median: 120000 },
      { currency: "USD", count: 2000, total: 12000000, average: 6000, median: 5000 },
    ],
    averageSalaryUsd: 4555,
    medianSalaryUsd: 3587,
    byDepartment: [{ name: "Engineering", count: 4000, averageUsd: 5200, medianUsd: 4800 }],
    byCountry: [{ name: "India", count: 6000, averageUsd: 3000, medianUsd: 2600 }],
    byLevel: [{ name: "Senior", count: 3000, averageUsd: 6000, medianUsd: 5500 }],
    distributionUsd: [{ bucket: "$0–2k", count: 1500 }],
    topEarners: [
      {
        name: "Asha Verma",
        jobTitle: "Director",
        department: "Engineering",
        country: "India",
        baseSalary: 900000,
        currency: "INR",
        usd: 10800,
      },
    ],
    outliers: [
      {
        name: "Ravi Kumar",
        department: "Engineering",
        baseSalary: 1200000,
        currency: "INR",
        usd: 14400,
        departmentMedianUsd: 4800,
      },
    ],
    ...overrides,
  };
}

describe("Dashboard page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders a loading state first", () => {
    analyticsMock.mockResolvedValue(makeAnalytics());
    render(<DashboardPage />);
    expect(screen.getByText("Loading analytics…")).toBeInTheDocument();
  });

  it("renders analytics once loaded", async () => {
    analyticsMock.mockResolvedValue(makeAnalytics());
    render(<DashboardPage />);
    expect(await screen.findByText("How ACME pays people")).toBeInTheDocument();
    expect(screen.getByText("10,000")).toBeInTheDocument();
    expect(screen.getByText("$4,555")).toBeInTheDocument();
    expect(screen.getByText("$3,587")).toBeInTheDocument();
    expect(screen.getByText("Asha Verma")).toBeInTheDocument();
    expect(screen.getByText("Ravi Kumar")).toBeInTheDocument();
    // "Engineering" appears twice: the department bar and the outlier row.
    expect(screen.getAllByText("Engineering")).toHaveLength(2);
    expect(screen.getByText("Payroll by currency (per month, local currency)")).toBeInTheDocument();
  });

  it("shows a dash for the largest payroll when no currency rows exist", async () => {
    analyticsMock.mockResolvedValue(makeAnalytics({ payrollByCurrency: [] }));
    render(<DashboardPage />);
    expect(await screen.findByText("How ACME pays people")).toBeInTheDocument();
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("shows the empty-outliers message when there are no outliers", async () => {
    analyticsMock.mockResolvedValue(makeAnalytics({ outliers: [] }));
    render(<DashboardPage />);
    expect(await screen.findByText("No outliers right now.")).toBeInTheDocument();
  });

  it("renders an error state when the backend is unreachable", async () => {
    analyticsMock.mockRejectedValue(new Error("fetch failed"));
    render(<DashboardPage />);
    expect(await screen.findByText(/Could not load analytics: fetch failed/)).toBeInTheDocument();
  });
});
