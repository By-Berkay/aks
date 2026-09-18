import { z } from "zod";

export const companyCreateSchema = z.object({
  name: z.string().min(2).max(120),
  shortName: z.string().min(1).max(40),
  taxNumber: z.string().max(20).optional().or(z.literal("")),
  taxOffice: z.string().max(80).optional().or(z.literal("")),
  phone: z.string().max(30).optional().or(z.literal("")),
  email: z.string().email().optional().or(z.literal("")),
  address: z.string().max(500).optional().or(z.literal("")),
  website: z.string().max(200).optional().or(z.literal("")),
  logoUrl: z.string().max(500).optional().or(z.literal("")),
  currency: z.string().length(3).default("TRY"),
  country: z.string().length(2).default("TR"),
  locale: z.enum(["tr", "en"]).default("tr"),
  status: z.enum(["TRIAL", "ACTIVE", "SUSPENDED", "EXPIRED", "CANCELLED"]).default("TRIAL"),
  planCode: z.string().optional(),
  trialDays: z.coerce.number().int().min(0).max(365).default(14),
  maxUsers: z.coerce.number().int().min(1).max(1000).optional(),
  maxBranches: z.coerce.number().int().min(1).max(500).optional(),
  maxWarehouses: z.coerce.number().int().min(1).max(1000).optional(),
  primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#2563eb"),
  // Opsiyonel: firma ile birlikte admin kullanici olustur
  adminFullName: z.string().min(2).max(120).optional(),
  adminEmail: z.string().email().optional(),
  adminPassword: z.string().min(8).max(72).optional(),
});

export const companyUpdateSchema = companyCreateSchema
  .omit({ adminFullName: true, adminEmail: true, adminPassword: true, trialDays: true })
  .partial();

export type CompanyCreateInput = z.infer<typeof companyCreateSchema>;
export type CompanyUpdateInput = z.infer<typeof companyUpdateSchema>;
