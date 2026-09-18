import { z } from "zod";

export const branchSchema = z.object({
  code: z.string().min(2).max(20).regex(/^[A-Za-z0-9_-]+$/, "Sadece harf, rakam, - ve _"),
  name: z.string().min(2).max(120),
  phone: z.string().max(30).optional().or(z.literal("")),
  address: z.string().max(500).optional().or(z.literal("")),
  manager: z.string().max(120).optional().or(z.literal("")),
  status: z.enum(["ACTIVE", "PASSIVE"]).default("ACTIVE"),
});

export const warehouseSchema = z.object({
  branchId: z.string().uuid(),
  code: z.string().min(2).max(20),
  name: z.string().min(2).max(120),
  isDefault: z.boolean().default(false),
  status: z.enum(["ACTIVE", "PASSIVE"]).default("ACTIVE"),
});

export const cashRegisterSchema = warehouseSchema;

export type BranchInput = z.infer<typeof branchSchema>;
export type WarehouseInput = z.infer<typeof warehouseSchema>;
