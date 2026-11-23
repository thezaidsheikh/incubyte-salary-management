import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import EmployeeDetailPage from "./page";
import { api, type Employee, type SalaryHistory } from "@/features/employees/api";

// Mock only the two calls this page uses; the rest of the client stays real.
vi.mock("@/features/employees/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/features/employees/api")>();
  return {
    ...actual,
    api: { ...actual.api, getEmployee: vi.fn(), updateSalary: vi.fn() },
  };
});

// Route param is mutable per test via the hoisted store.
const navStore = vi.hoisted(() => ({ params: { id: "emp-1" } as Record<string, string> }));
vi.mock("next/navigation", () => ({ useParams: () => navStore.params }));

const getMock = vi.mocked(api.getEmployee);
const updateMock = vi.mocked(api.updateSalary);

const employee: Employee & { salaryHistory: SalaryHistory[] } = {
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
  salaryHistory: [
    {
      id: "h1",
      oldSalary: 140000,
      newSalary: 150000,
      currency: "INR",
      reason: "Annual appraisal",
      changedBy: "hr@acme.example",
      changedAt: "2024-04-01T00:00:00.000Z",
    },
  ],
};

describe("EmployeeDetail page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    navStore.params = { id: "emp-1" };
  });

  it("renders a loading state first", () => {
    getMock.mockResolvedValue(employee);
    render(<EmployeeDetailPage />);
    expect(screen.getByText("Loading…")).toBeInTheDocument();
  });

  it("renders the profile and salary history once loaded", async () => {
    getMock.mockResolvedValue(employee);
    render(<EmployeeDetailPage />);
    expect(await screen.findByText("Priya Sharma")).toBeInTheDocument();
    expect(screen.getByText(/Senior Engineer · Engineering · India · Senior/)).toBeInTheDocument();
    // History line is split across text nodes — match by regex on the row.
    expect(screen.getByText(/Annual appraisal · hr@acme\.example/)).toBeInTheDocument();
    expect(screen.getByText("Edit salary")).toBeInTheDocument();
  });

  it("shows the empty-history message when there are no changes", async () => {
    getMock.mockResolvedValue({ ...employee, salaryHistory: [] });
    render(<EmployeeDetailPage />);
    expect(
      await screen.findByText("No changes yet — this is the starting salary from the seed."),
    ).toBeInTheDocument();
  });

  it("renders an error state when loading fails", async () => {
    getMock.mockRejectedValue(new Error("Not found"));
    render(<EmployeeDetailPage />);
    expect(await screen.findByText("Not found")).toBeInTheDocument();
  });

  it("does not fetch when there is no id in the route", () => {
    navStore.params = {};
    getMock.mockResolvedValue(employee);
    render(<EmployeeDetailPage />);
    expect(screen.getByText("Loading…")).toBeInTheDocument();
    expect(getMock).not.toHaveBeenCalled();
  });

  it("rejects a non-positive salary", async () => {
    getMock.mockResolvedValue(employee);
    render(<EmployeeDetailPage />);
    await screen.findByText("Priya Sharma");
    fireEvent.change(screen.getByLabelText(/New salary/), { target: { value: "0" } });
    fireEvent.click(screen.getByRole("button", { name: "Save salary change" }));
    expect(await screen.findByText("New salary must be a whole number greater than 0.")).toBeInTheDocument();
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("rejects a salary equal to the current salary", async () => {
    getMock.mockResolvedValue(employee);
    render(<EmployeeDetailPage />);
    await screen.findByText("Priya Sharma");
    fireEvent.change(screen.getByLabelText(/New salary/), { target: { value: "150000" } });
    fireEvent.change(screen.getByLabelText(/Reason/), { target: { value: "Annual appraisal" } });
    fireEvent.click(screen.getByRole("button", { name: "Save salary change" }));
    expect(await screen.findByText("New salary must differ from the current salary.")).toBeInTheDocument();
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("rejects a reason shorter than 3 characters", async () => {
    getMock.mockResolvedValue(employee);
    render(<EmployeeDetailPage />);
    await screen.findByText("Priya Sharma");
    fireEvent.change(screen.getByLabelText(/New salary/), { target: { value: "165000" } });
    fireEvent.change(screen.getByLabelText(/Reason/), { target: { value: "ab" } });
    fireEvent.click(screen.getByRole("button", { name: "Save salary change" }));
    expect(await screen.findByText("A reason is required (at least 3 characters).")).toBeInTheDocument();
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("saves a valid change and shows the confirmation", async () => {
    getMock.mockResolvedValue(employee);
    updateMock.mockResolvedValue({
      employee: { ...employee, baseSalary: 165000 },
      history: {
        id: "h2",
        oldSalary: 150000,
        newSalary: 165000,
        currency: "INR",
        reason: "Annual appraisal",
        changedBy: "hr@acme.example",
        changedAt: "2026-11-23T00:00:00.000Z",
      },
    });
    render(<EmployeeDetailPage />);
    await screen.findByText("Priya Sharma");
    fireEvent.change(screen.getByLabelText(/New salary/), { target: { value: "165000" } });
    fireEvent.change(screen.getByLabelText(/Reason/), { target: { value: "Annual appraisal" } });
    fireEvent.click(screen.getByRole("button", { name: "Save salary change" }));
    expect(await screen.findByText(/Salary updated from/)).toBeInTheDocument();
    expect(updateMock).toHaveBeenCalledWith("emp-1", 165000, "Annual appraisal");
    expect(getMock).toHaveBeenCalledTimes(2); // initial load + reload after save
  });

  it("shows the API error when saving fails", async () => {
    getMock.mockResolvedValue(employee);
    updateMock.mockRejectedValue(new Error("Salary out of band"));
    render(<EmployeeDetailPage />);
    await screen.findByText("Priya Sharma");
    fireEvent.change(screen.getByLabelText(/New salary/), { target: { value: "165000" } });
    fireEvent.change(screen.getByLabelText(/Reason/), { target: { value: "Annual appraisal" } });
    fireEvent.click(screen.getByRole("button", { name: "Save salary change" }));
    expect(await screen.findByText("Salary out of band")).toBeInTheDocument();
  });

  it("shows a generic message when saving throws a non-Error", async () => {
    getMock.mockResolvedValue(employee);
    updateMock.mockRejectedValue("plain string failure");
    render(<EmployeeDetailPage />);
    await screen.findByText("Priya Sharma");
    fireEvent.change(screen.getByLabelText(/New salary/), { target: { value: "165000" } });
    fireEvent.change(screen.getByLabelText(/Reason/), { target: { value: "Annual appraisal" } });
    fireEvent.click(screen.getByRole("button", { name: "Save salary change" }));
    expect(await screen.findByText("Update failed")).toBeInTheDocument();
  });
});
