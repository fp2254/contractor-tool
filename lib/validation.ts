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

export const leadSchema = z.object({
  name: z.string().min(1),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional(),
  lead_source: z.string().optional(),
  job_type: z.string().optional(),
  notes: z.string().optional(),
  status: z.enum(["new","contacted","quoted","scheduled","won","lost"]).default("new"),
});

export const quoteItemSchema = z.object({
  description: z.string().min(1),
  quantity: z.number().positive(),
  unit_price: z.number().nonnegative(),
});

export const quoteSchema = z.object({
  customer_id: z.string().uuid().or(z.literal("")),
  notes: z.string().optional(),
  items: z.array(quoteItemSchema).min(1),
  scope_items: z.array(z.string()).optional(),
  estimated_time: z.string().optional(),
});

export const jobSchema = z.object({
  customer_id: z.string().uuid(),
  job_title: z.string().min(1),
  status: z.enum(["scheduled", "in_progress", "completed", "cancelled"]),
  scheduled_date: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
});

export const paymentSchema = z.object({
  invoice_id: z.string().uuid(),
  customer_id: z.string().uuid(),
  amount: z.number().positive(),
  payment_method: z.enum(["cash","check","card","venmo","paypal","other"]),
  payment_date: z.string().optional(),
  notes: z.string().optional(),
});
