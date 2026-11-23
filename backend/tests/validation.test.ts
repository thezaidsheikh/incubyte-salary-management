import { describe, expect, it } from "vitest";
import { createEmployeeSchema, updateSalarySchema } from "../src/validation/employee";

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
});
