import { z } from "zod";

export const customerSchema = z.object({
  first_name: z.string().min(1),
  last_name: z.string().optional(),
  company_name: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  address_line1: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional(),
  notes: z.string().optional(),
});

export const quoteItemSchema = z.object({
  description: z.string().min(1),
  quantity: z.number().positive(),
  unit_price: z.number().nonnegative(),
});

export const quoteSchema = z.object({
  customer_id: z.string().uuid(),
  notes: z.string().optional(),
  items: z.array(quoteItemSchema).min(1),
});

export const jobSchema = z.object({
  customer_id: z.string().uuid(),
  job_title: z.string().min(1),
  status: z.enum(["scheduled", "in_progress", "completed", "cancelled"]),
  scheduled_date: z.string().optional(),
  notes: z.string().optional(),
});
