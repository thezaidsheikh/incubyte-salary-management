import { z } from "zod";

export const levelSchema = z.enum(["Junior", "Mid", "Senior", "Lead", "Manager", "Director"]);
export const createEmployeeSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required").max(50),
  lastName: z.string().trim().min(1, "Last name is required").max(50),
  email: z.string().email("Valid email is required"),
  department: z.string().trim().min(1).max(50),
  country: z.string().trim().min(1).max(50),
  currency: z.string().trim().length(3),
  jobTitle: z.string().trim().min(1).max(80),
  level: levelSchema,
  managerId: z.string().uuid().nullable().optional(),
  dateOfJoining: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "dateOfJoining must be YYYY-MM-DD"),
  baseSalary: z.number().int().positive("baseSalary must be > 0"),
});
export const updateSalarySchema = z.object({
  newSalary: z.number().int().positive("newSalary must be > 0"),
  reason: z.string().trim().min(3, "reason is required (min 3 characters)").max(500),
  changedBy: z.string().trim().min(1).max(80).optional(),
});
export const listQuerySchema = z.object({
  search: z.string().trim().max(100).optional(),
  department: z.string().trim().optional(),
  country: z.string().trim().optional(),
  level: levelSchema.optional(),
  sortBy: z.enum(["baseSalary", "lastName", "dateOfJoining"]).default("lastName"),
  sortOrder: z.enum(["asc", "desc"]).default("asc"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>;
export type UpdateSalaryInput = z.infer<typeof updateSalarySchema>;
export type ListQuery = z.infer<typeof listQuerySchema>;
