import { describe, expect, it } from "vitest";
import { createEmployeeSchema, listQuerySchema, updateSalarySchema } from "../src/modules/employees/employee.validation";

const validEmployee = {
  firstName: "Priya", lastName: "Sharma", email: "priya.sharma@acme.com",
  department: "Engineering", country: "India", currency: "INR",
  jobTitle: "Software Engineer", level: "Senior", dateOfJoining: "2022-03-01", baseSalary: 150000,
};

describe("validation", () => {
  it("rejects salary <= 0 and missing reason", () => {
    expect(updateSalarySchema.safeParse({ newSalary: 0, reason: "raise" }).success).toBe(false);
    expect(updateSalarySchema.safeParse({ newSalary: -5, reason: "raise" }).success).toBe(false);
    expect(updateSalarySchema.safeParse({ newSalary: 100, reason: "" }).success).toBe(false);
    expect(updateSalarySchema.safeParse({ newSalary: 160000, reason: "Annual appraisal" }).success).toBe(true);
  });
  it("rejects bad email and bad level on create", () => {
    expect(createEmployeeSchema.safeParse({ ...validEmployee, email: "not-an-email" }).success).toBe(false);
    expect(createEmployeeSchema.safeParse({ ...validEmployee, level: "Intern" }).success).toBe(false);
    expect(createEmployeeSchema.safeParse(validEmployee).success).toBe(true);
  });
  it("create: rejects bad date, non-positive/non-integer salary, bad currency, bad managerId", () => {
    expect(createEmployeeSchema.safeParse({ ...validEmployee, dateOfJoining: "01-03-2022" }).success).toBe(false);
    expect(createEmployeeSchema.safeParse({ ...validEmployee, dateOfJoining: "2022/03/01" }).success).toBe(false);
    expect(createEmployeeSchema.safeParse({ ...validEmployee, baseSalary: 0 }).success).toBe(false);
    expect(createEmployeeSchema.safeParse({ ...validEmployee, baseSalary: -100 }).success).toBe(false);
    expect(createEmployeeSchema.safeParse({ ...validEmployee, baseSalary: 150000.5 }).success).toBe(false);
    expect(createEmployeeSchema.safeParse({ ...validEmployee, currency: "IN" }).success).toBe(false);
    expect(createEmployeeSchema.safeParse({ ...validEmployee, currency: "INRR" }).success).toBe(false);
    expect(createEmployeeSchema.safeParse({ ...validEmployee, managerId: "not-a-uuid" }).success).toBe(false);
    expect(createEmployeeSchema.safeParse({ ...validEmployee, firstName: "" }).success).toBe(false);
    expect(createEmployeeSchema.safeParse({ ...validEmployee, firstName: "  " }).success).toBe(false);
  });
  it("create: accepts optional managerId (uuid or null) and trims names", () => {
    const withManager = { ...validEmployee, managerId: "123e4567-e89b-12d3-a456-426614174000" };
    expect(createEmployeeSchema.safeParse(withManager).success).toBe(true);
    expect(createEmployeeSchema.safeParse({ ...validEmployee, managerId: null }).success).toBe(true);
    const parsed = createEmployeeSchema.parse({ ...validEmployee, firstName: "  Priya " });
    expect(parsed.firstName).toBe("Priya");
  });
  it("updateSalary: rejects non-integer salary, short reason, missing reason", () => {
    expect(updateSalarySchema.safeParse({ newSalary: 100.5, reason: "Annual appraisal" }).success).toBe(false);
    expect(updateSalarySchema.safeParse({ newSalary: 160000, reason: "ab" }).success).toBe(false);
    expect(updateSalarySchema.safeParse({ newSalary: 160000 }).success).toBe(false);
    expect(updateSalarySchema.safeParse({ newSalary: 160000, reason: "Annual appraisal", changedBy: "Zaid" }).success).toBe(true);
  });
  it("listQuery: defaults apply, strings coerce, out-of-range pages fail", () => {
    const def = listQuerySchema.parse({});
    expect(def).toEqual({ sortBy: "lastName", sortOrder: "asc", page: 1, pageSize: 20 });
    expect(listQuerySchema.parse({ page: "3", pageSize: "5" }).page).toBe(3);
    expect(listQuerySchema.safeParse({ page: 0 }).success).toBe(false);
    expect(listQuerySchema.safeParse({ page: -1 }).success).toBe(false);
    expect(listQuerySchema.safeParse({ page: 1.5 }).success).toBe(false);
    expect(listQuerySchema.safeParse({ pageSize: 0 }).success).toBe(false);
    expect(listQuerySchema.safeParse({ pageSize: 101 }).success).toBe(false);
    expect(listQuerySchema.parse({ pageSize: 100 }).pageSize).toBe(100);
    expect(listQuerySchema.safeParse({ sortBy: "email" }).success).toBe(false);
    expect(listQuerySchema.safeParse({ sortOrder: "up" }).success).toBe(false);
    expect(listQuerySchema.safeParse({ level: "Intern" }).success).toBe(false);
    expect(listQuerySchema.safeParse({ search: "x".repeat(101) }).success).toBe(false);
    expect(listQuerySchema.parse({ sortBy: "baseSalary", sortOrder: "desc" }).sortBy).toBe("baseSalary");
  });
});
