import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import AddEmployeePage from "./page";
import { api, type Employee } from "@/features/employees/api";

// Mock only the create call; the rest of the client stays real.
vi.mock("@/features/employees/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/features/employees/api")>();
  return { ...actual, api: { ...actual.api, createEmployee: vi.fn() } };
});

// Router is mutable per test via the hoisted store.
const navStore = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => navStore }));

const createMock = vi.mocked(api.createEmployee);

const created: Employee = {
  id: "emp-9",
  firstName: "Asha",
  lastName: "Verma",
  email: "asha@acme.example",
  department: "Engineering",
  country: "India",
  currency: "INR",
  jobTitle: "Engineer",
  level: "Junior",
  managerId: null,
  dateOfJoining: "2026-11-23",
  employmentStatus: "active",
  baseSalary: 120000,
};

/** Fills the form with valid values (overrides per test). */
function fillValidForm(overrides: Record<string, string> = {}) {
  const values: Record<string, string> = {
    "First name": "Asha",
    "Last name": "Verma",
    Email: "asha@acme.example",
    "Job title": "Engineer",
    "Base salary": "120000",
    ...overrides,
  };
  for (const [label, value] of Object.entries(values)) {
    fireEvent.change(screen.getByLabelText(label), { target: { value } });
  }
}

describe("AddEmployee page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("requires first name, last name and job title", async () => {
    render(<AddEmployeePage />);
    fireEvent.click(screen.getByRole("button", { name: "Create employee" }));
    expect(await screen.findByText("First name, last name and job title are required.")).toBeInTheDocument();
    expect(createMock).not.toHaveBeenCalled();
  });

  it("requires a valid email", async () => {
    render(<AddEmployeePage />);
    fillValidForm({ Email: "not-an-email" });
    fireEvent.click(screen.getByRole("button", { name: "Create employee" }));
    expect(await screen.findByText("Enter a valid email.")).toBeInTheDocument();
    expect(createMock).not.toHaveBeenCalled();
  });

  it("requires a whole positive salary", async () => {
    render(<AddEmployeePage />);
    fillValidForm({ "Base salary": "0" });
    fireEvent.click(screen.getByRole("button", { name: "Create employee" }));
    expect(
      await screen.findByText("Base salary must be a whole number greater than 0."),
    ).toBeInTheDocument();
    expect(createMock).not.toHaveBeenCalled();
  });

  it("creates the employee and navigates to their detail page", async () => {
    createMock.mockResolvedValue(created);
    render(<AddEmployeePage />);
    fillValidForm();
    fireEvent.click(screen.getByRole("button", { name: "Create employee" }));
    await vi.waitFor(() => expect(createMock).toHaveBeenCalled());
    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({
        firstName: "Asha",
        lastName: "Verma",
        email: "asha@acme.example",
        jobTitle: "Engineer",
        currency: "INR",
        baseSalary: 120000,
      }),
    );
    expect(navStore.push).toHaveBeenCalledWith("/employees/emp-9");
  });

  it("derives the currency from the selected country", async () => {
    createMock.mockResolvedValue({ ...created, country: "USA", currency: "USD" });
    render(<AddEmployeePage />);
    fillValidForm();
    fireEvent.change(screen.getByLabelText("Country"), { target: { value: "USA" } });
    fireEvent.click(screen.getByRole("button", { name: "Create employee" }));
    await vi.waitFor(() => expect(createMock).toHaveBeenCalled());
    expect(createMock).toHaveBeenCalledWith(expect.objectContaining({ country: "USA", currency: "USD" }));
  });

  it("shows the API error when creation fails", async () => {
    createMock.mockRejectedValue(new Error("Email already exists"));
    render(<AddEmployeePage />);
    fillValidForm();
    fireEvent.click(screen.getByRole("button", { name: "Create employee" }));
    expect(await screen.findByText("Email already exists")).toBeInTheDocument();
    expect(navStore.push).not.toHaveBeenCalled();
  });

  it("sends the selected department, level and joining date", async () => {
    createMock.mockResolvedValue(created);
    render(<AddEmployeePage />);
    fillValidForm();
    fireEvent.change(screen.getByLabelText("Department"), { target: { value: "Design" } });
    fireEvent.change(screen.getByLabelText("Level"), { target: { value: "Senior" } });
    fireEvent.change(screen.getByLabelText("Date of joining"), { target: { value: "2025-01-15" } });
    fireEvent.click(screen.getByRole("button", { name: "Create employee" }));
    await vi.waitFor(() => expect(createMock).toHaveBeenCalled());
    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({ department: "Design", level: "Senior", dateOfJoining: "2025-01-15" }),
    );
  });

  it("shows a generic message when creation throws a non-Error", async () => {
    createMock.mockRejectedValue("plain string failure");
    render(<AddEmployeePage />);
    fillValidForm();
    fireEvent.click(screen.getByRole("button", { name: "Create employee" }));
    expect(await screen.findByText("Could not create employee")).toBeInTheDocument();
    expect(navStore.push).not.toHaveBeenCalled();
  });
});
