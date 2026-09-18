import { z } from "zod";

export const userCreateSchema = z.object({
  fullName: z.string().min(2).max(120),
  email: z.string().email(),
  username: z.string().min(3).max(40).optional().or(z.literal("")),
  phone: z.string().max(30).optional().or(z.literal("")),
  password: z.string().min(8).max(72),
  roleCode: z.string().min(2).max(40),
  branchIds: z.array(z.string().uuid()).default([]),
  maxDiscountPercent: z.coerce.number().min(0).max(100).optional(),
  status: z.enum(["ACTIVE", "PASSIVE", "LOCKED"]).default("ACTIVE"),
  permissionOverrides: z
    .array(z.object({ code: z.string(), effect: z.enum(["ALLOW", "DENY"]) }))
    .default([]),
});

export const userUpdateSchema = userCreateSchema.partial().omit({ password: true });

export const passwordResetSchema = z.object({ password: z.string().min(8).max(72) });

export type UserCreateInput = z.infer<typeof userCreateSchema>;
export type UserUpdateInput = z.infer<typeof userUpdateSchema>;
