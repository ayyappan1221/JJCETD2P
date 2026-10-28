import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  fullName: z.string().min(2),
  rollNumber: z.string().optional(),
  department: z.string().optional(),
});

export const categorySchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  description: z.string().optional(),
});

export const componentSchema = z.object({
  code: z.string().min(1, "Code is required").max(50),
  name: z.string().min(1, "Name is required").max(255),
  categoryId: z.string().uuid().optional().nullable(),
  description: z.string().optional(),
  unit: z.string().min(1).max(30).default("pcs"),
  totalQuantity: z.number().int().min(0),
  storageLocation: z.string().optional(),
  minStockThreshold: z.number().int().min(0).default(0),
});

export const borrowingRequestSchema = z.object({
  componentId: z.string().uuid(),
  quantity: z.number().int().positive("Quantity must be positive"),
  purpose: z.string().optional(),
  requestedReturnDate: z.string().datetime(),
});

export const approvalSchema = z.object({
  action: z.enum(["approve", "reject"]),
  rejectionReason: z.string().optional(),
});

export const issueSchema = z.object({
  requestId: z.string().uuid(),
});

export const returnSchema = z.object({
  issueId: z.string().uuid(),
  quantity: z.number().int().positive("Quantity must be positive"),
  notes: z.string().optional(),
});

export const stockReceiptSchema = z.object({
  componentId: z.string().uuid(),
  quantity: z.number().int().positive("Quantity must be positive"),
  reason: z.string().min(1, "Reason is required"),
});

export const stockAdjustmentSchema = z.object({
  componentId: z.string().uuid(),
  quantityDelta: z.number().int().refine((v) => v !== 0, "Delta cannot be zero"),
  reason: z.string().min(1, "Reason is required"),
});

export const userUpdateSchema = z.object({
  fullName: z.string().min(2).optional(),
  rollNumber: z.string().optional(),
  department: z.string().optional(),
  phone: z.string().optional(),
  isActive: z.boolean().optional(),
  roles: z.array(z.enum(["ADMIN", "D2P_INCHARGE", "STUDENT"])).optional(),
});

export const settingsSchema = z.object({
  key: z.string().min(1),
  value: z.string(),
});
