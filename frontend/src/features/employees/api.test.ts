import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "./api";
import type { Analytics, Employee } from "./types";

/** Builds a minimal fetch Response double for the given body/ok flag. */
function mockFetch(body: unknown, ok = true, status = 200) {
  return vi.fn().mockResolvedValue({
    ok,
    status,
    json: async () => body,
  });
}

const employee: Employee = {
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

describe("api client", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    fetchMock.mockReset();
  });

  it("health unwraps the data envelope", async () => {
    fetchMock.mockImplementation(mockFetch({ data: { status: "ok" } }));
    await expect(api.health()).resolves.toEqual({ status: "ok" });
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:4000/api/health",
      expect.objectContaining({ headers: { "Content-Type": "application/json" } }),
    );
  });

  it("analytics unwraps the data envelope", async () => {
    const analytics = { totalEmployees: 3 } as unknown as Analytics;
    fetchMock.mockImplementation(mockFetch({ data: analytics }));
    await expect(api.analytics()).resolves.toEqual(analytics);
  });

  it("throws the envelope message when the backend returns an error", async () => {
    fetchMock.mockImplementation(mockFetch({ error: { message: "Not found" } }, false, 404));
    await expect(api.getEmployee("nope")).rejects.toThrow("Not found");
  });

  it("falls back to a status message when the error body is not JSON", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 500, json: async () => { throw new Error("bad json"); } });
    await expect(api.getEmployee("x")).rejects.toThrow("Request failed (500)");
  });

  it("falls back to a status message when the envelope has no message", async () => {
    fetchMock.mockImplementation(mockFetch({}, false, 403));
    await expect(api.health()).rejects.toThrow("Request failed (403)");
  });

  it("listEmployees sends query params and returns data + meta", async () => {
    const payload = { data: [employee], meta: { total: 1, page: 1, pageSize: 20, totalPages: 1 } };
    fetchMock.mockImplementation(mockFetch(payload));
    await expect(
      api.listEmployees({ page: 1, pageSize: 20, sortBy: "lastName", sortOrder: "asc", search: "Priya" }),
    ).resolves.toEqual(payload);
    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).toContain("/api/employees?");
    expect(url).toContain("search=Priya");
    expect(url).toContain("page=1");
  });

  it("listEmployees throws the envelope message on failure", async () => {
    fetchMock.mockImplementation(mockFetch({ error: { message: "DB down" } }, false, 500));
    await expect(api.listEmployees({ page: 1 })).rejects.toThrow("DB down");
  });

  it("listEmployees falls back to a generic message without an envelope message", async () => {
    fetchMock.mockImplementation(mockFetch({}, false, 500));
    await expect(api.listEmployees({ page: 1 })).rejects.toThrow("Failed to load employees");
  });

  it("getEmployee returns the employee with salary history", async () => {
    const payload = { ...employee, salaryHistory: [] };
    fetchMock.mockImplementation(mockFetch({ data: payload }));
    await expect(api.getEmployee("emp-1")).resolves.toEqual(payload);
  });

  it("createEmployee POSTs the JSON payload", async () => {
    fetchMock.mockImplementation(mockFetch({ data: employee }));
    await expect(api.createEmployee({ firstName: "Priya", baseSalary: 150000 })).resolves.toEqual(employee);
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:4000/api/employees",
      expect.objectContaining({ method: "POST", body: JSON.stringify({ firstName: "Priya", baseSalary: 150000 }) }),
    );
  });

  it("updateSalary PATCHes the new salary and reason", async () => {
    fetchMock.mockImplementation(mockFetch({ data: { employee, history: { id: "h1" } } }));
    await api.updateSalary("emp-1", 165000, "Annual appraisal");
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:4000/api/employees/emp-1/salary",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ newSalary: 165000, reason: "Annual appraisal" }),
      }),
    );
  });

  it("exportUrl builds a CSV export URL with the given params", () => {
    expect(api.exportUrl({ department: "Engineering", format: "csv" })).toBe(
      "http://localhost:4000/api/employees/export?department=Engineering&format=csv",
    );
  });
});
