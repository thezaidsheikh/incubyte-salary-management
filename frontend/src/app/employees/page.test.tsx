import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import EmployeesPage from "./page";
import { api, type Employee, type PageMeta } from "@/features/employees/api";

// Mock only listEmployees; exportUrl stays real so the CSV link is exercised.
vi.mock("@/features/employees/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/features/employees/api")>();
  return { ...actual, api: { ...actual.api, listEmployees: vi.fn() } };
});

// next/link needs no router context in this test — render a plain anchor.
vi.mock("next/link", () => ({
  default: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

const listMock = vi.mocked(api.listEmployees);

const priya: Employee = {
  id: "emp-1",
  firstName: "Priya",
  lastName: "Sharma",
  email: "priya@acme.example",
  department: "Engineering",
  country: "India",
  currency: "INR",
  jobTitle: "Senior Engineer",
  level: "Senior",
  managerId: null,
  dateOfJoining: "2022-03-01T00:00:00.000Z",
  employmentStatus: "active",
  baseSalary: 150000,
};

const rahul: Employee = {
  ...priya,
  id: "emp-2",
  firstName: "Rahul",
  lastName: "Mehta",
  email: "rahul@acme.example",
  department: "Design",
  country: "USA",
  currency: "USD",
  baseSalary: 8000,
};

function meta(overrides: Partial<PageMeta> = {}): PageMeta {
  return { total: 2, page: 1, pageSize: 20, totalPages: 1, ...overrides };
}

describe("Employees page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders a loading state first", () => {
    listMock.mockResolvedValue({ data: [priya], meta: meta() });
    render(<EmployeesPage />);
    expect(screen.getByText("Loading…")).toBeInTheDocument();
  });

  it("renders rows, total and pagination once loaded", async () => {
    listMock.mockResolvedValue({ data: [priya, rahul], meta: meta() });
    render(<EmployeesPage />);
    expect(await screen.findByText("Priya Sharma")).toBeInTheDocument();
    expect(screen.getByText("Rahul Mehta")).toBeInTheDocument();
    expect(screen.getByText("Page 1 of 1 · 2 employees")).toBeInTheDocument();
    // Single page: both pagination buttons disabled.
    expect(screen.getByRole("button", { name: "Previous" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();
    // Export link carries the CSV format param.
    expect(screen.getByText("Export CSV").getAttribute("href")).toContain("format=csv");
  });

  it("renders an empty state when no employees match", async () => {
    listMock.mockResolvedValue({ data: [], meta: meta({ total: 0, totalPages: 0 }) });
    render(<EmployeesPage />);
    expect(await screen.findByText("No employees match these filters.")).toBeInTheDocument();
  });

  it("renders an error state when loading fails", async () => {
    listMock.mockRejectedValue(new Error("fetch failed"));
    render(<EmployeesPage />);
    expect(await screen.findByText(/Could not load employees: fetch failed/)).toBeInTheDocument();
  });

  it("sends the search term (debounced) and resets to page 1", async () => {
    listMock.mockResolvedValue({ data: [priya], meta: meta({ total: 1 }) });
    render(<EmployeesPage />);
    await screen.findByText("Priya Sharma");
    fireEvent.change(screen.getByPlaceholderText("Search name or email…"), { target: { value: "Priya" } });
    await waitFor(() =>
      expect(listMock).toHaveBeenCalledWith(
        expect.objectContaining({ search: "Priya", page: 1 }),
      ),
    );
  });

  it("sends filter values when department, country and level change", async () => {
    listMock.mockResolvedValue({ data: [priya], meta: meta({ total: 1 }) });
    render(<EmployeesPage />);
    await screen.findByText("Priya Sharma");
    fireEvent.change(screen.getByLabelText("Department"), { target: { value: "Engineering" } });
    await waitFor(() =>
      expect(listMock).toHaveBeenCalledWith(expect.objectContaining({ department: "Engineering" })),
    );
    fireEvent.change(screen.getByLabelText("Country"), { target: { value: "USA" } });
    await waitFor(() =>
      expect(listMock).toHaveBeenCalledWith(expect.objectContaining({ country: "USA" })),
    );
    fireEvent.change(screen.getByLabelText("Level"), { target: { value: "Senior" } });
    await waitFor(() =>
      expect(listMock).toHaveBeenCalledWith(expect.objectContaining({ level: "Senior" })),
    );
  });

  it("sends sort values when sort selects change", async () => {
    listMock.mockResolvedValue({ data: [priya], meta: meta({ total: 1 }) });
    render(<EmployeesPage />);
    await screen.findByText("Priya Sharma");
    fireEvent.change(screen.getByLabelText("Sort by"), { target: { value: "baseSalary" } });
    await waitFor(() =>
      expect(listMock).toHaveBeenCalledWith(expect.objectContaining({ sortBy: "baseSalary" })),
    );
    fireEvent.change(screen.getByLabelText("Sort order"), { target: { value: "desc" } });
    await waitFor(() =>
      expect(listMock).toHaveBeenCalledWith(expect.objectContaining({ sortOrder: "desc" })),
    );
  });

  it("paginates forward and back, disabling buttons at the ends", async () => {
    listMock.mockResolvedValue({ data: [priya], meta: meta({ total: 40, totalPages: 2 }) });
    render(<EmployeesPage />);
    await screen.findByText("Priya Sharma");
    const next = screen.getByRole("button", { name: "Next" });
    const prev = screen.getByRole("button", { name: "Previous" });
    expect(prev).toBeDisabled();
    expect(next).not.toBeDisabled();
    fireEvent.click(next);
    await waitFor(() => expect(listMock).toHaveBeenCalledWith(expect.objectContaining({ page: 2 })));
    // Page 2 is served by the same mock (meta still says page 1 in the
    // payload), so assert the request, not the rendered page label.
    fireEvent.click(screen.getByRole("button", { name: "Previous" }));
    await waitFor(() => expect(listMock).toHaveBeenCalledWith(expect.objectContaining({ page: 1 })));
  });
});
