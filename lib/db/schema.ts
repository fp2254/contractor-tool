import {
  pgEnum,
  pgTable,
  uuid,
  text,
  timestamp,
  numeric,
  date,
  boolean,
  integer,
} from "drizzle-orm/pg-core";

export const leadStatus = pgEnum("lead_status", ["new", "contacted", "quoted", "scheduled", "lost"]);
export const jobStatus = pgEnum("job_status", ["scheduled", "in_progress", "completed", "cancelled"]);
export const photoTag = pgEnum("photo_tag", ["before", "after", "install", "other"]);
export const quoteStatus = pgEnum("quote_status", ["draft", "sent", "accepted", "declined"]);
export const invoiceStatus = pgEnum("invoice_status", ["unpaid", "paid", "overdue"]);
export const paymentMethod = pgEnum("payment_method", ["cash", "check", "card", "ach"]);
export const entityType = pgEnum("entity_type", ["job", "quote", "invoice", "payment", "lead"]);
export const followupStatus = pgEnum("followup_status", ["pending", "sent", "skipped"]);
export const messageChannel = pgEnum("message_channel", ["sms", "email"]);
export const leadListingStatus = pgEnum("lead_listing_status", ["open", "sold", "expired"]);

export const orgs = pgTable("orgs", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  ownerUserId: uuid("owner_user_id").notNull(),
  defaultPaymentTermsDays: integer("default_payment_terms_days").default(14).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const orgMembers = pgTable("org_members", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id").notNull(),
  userId: uuid("user_id").notNull(),
  role: text("role").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const customers = pgTable("customers", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  companyName: text("company_name"),
  phone: text("phone"),
  email: text("email"),
  addressLine1: text("address_line1"),
  addressLine2: text("address_line2"),
  city: text("city"),
  state: text("state"),
  zip: text("zip"),
  notes: text("notes"),
  createdByUser: uuid("created_by_user"),
});

export const leads = pgTable("leads", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  name: text("name"),
  phone: text("phone"),
  email: text("email"),
  address: text("address"),
  city: text("city"),
  state: text("state"),
  zip: text("zip"),
  leadSource: text("lead_source"),
  status: leadStatus("status").default("new").notNull(),
  notes: text("notes"),
  convertedCustomerId: uuid("converted_customer_id"),
});

export const jobs = pgTable("jobs", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  customerId: uuid("customer_id").notNull(),
  jobTitle: text("job_title").notNull(),
  serviceType: text("service_type"),
  address: text("address"),
  city: text("city"),
  state: text("state"),
  zip: text("zip"),
  scheduledDate: date("scheduled_date"),
  startTime: timestamp("start_time", { withTimezone: true }),
  endTime: timestamp("end_time", { withTimezone: true }),
  arrivedAt: timestamp("arrived_at", { withTimezone: true }),
  startedAt: timestamp("started_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  laborMinutes: integer("labor_minutes"),
  laborRate: numeric("labor_rate", { precision: 12, scale: 2 }),
  profitEstimate: numeric("profit_estimate", { precision: 12, scale: 2 }),
  status: jobStatus("status").default("scheduled").notNull(),
  notes: text("notes"),
  createdByUser: uuid("created_by_user"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  quoteId: uuid("quote_id"),
  invoiceId: uuid("invoice_id"),
});

export const quotes = pgTable("quotes", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  customerId: uuid("customer_id").notNull(),
  jobAddress: text("job_address"),
  city: text("city"),
  state: text("state"),
  zip: text("zip"),
  status: quoteStatus("status").default("draft").notNull(),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  acceptedAt: timestamp("accepted_at", { withTimezone: true }),
  declinedAt: timestamp("declined_at", { withTimezone: true }),
  invoiceId: uuid("invoice_id"),
  totalAmount: numeric("total_amount", { precision: 12, scale: 2 }).default("0").notNull(),
  notes: text("notes"),
  createdByUser: uuid("created_by_user"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const quoteItems = pgTable("quote_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  quoteId: uuid("quote_id").notNull(),
  description: text("description").notNull(),
  quantity: numeric("quantity", { precision: 12, scale: 2 }).notNull(),
  unitPrice: numeric("unit_price", { precision: 12, scale: 2 }).notNull(),
  totalPrice: numeric("total_price", { precision: 12, scale: 2 }).notNull(),
});

export const invoices = pgTable("invoices", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  customerId: uuid("customer_id").notNull(),
  jobId: uuid("job_id"),
  invoiceNumber: text("invoice_number"),
  status: invoiceStatus("status").default("unpaid").notNull(),
  totalAmount: numeric("total_amount", { precision: 12, scale: 2 }).default("0").notNull(),
  dueDate: timestamp("due_date", { withTimezone: true }),
  createdByUser: uuid("created_by_user"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const invoiceItems = pgTable("invoice_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  invoiceId: uuid("invoice_id").notNull(),
  description: text("description").notNull(),
  quantity: numeric("quantity", { precision: 12, scale: 2 }).notNull(),
  unitPrice: numeric("unit_price", { precision: 12, scale: 2 }).notNull(),
  totalPrice: numeric("total_price", { precision: 12, scale: 2 }).notNull(),
});

export const messageTemplates = pgTable("message_templates", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  createdBy: uuid("created_by").notNull(),
  name: text("name").notNull(),
  channel: messageChannel("channel").notNull(),
  subject: text("subject"),
  body: text("body").notNull(),
  isDefault: boolean("is_default").default(false).notNull(),
});

export const followups = pgTable("followups", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  createdBy: uuid("created_by").notNull(),
  quoteId: uuid("quote_id").notNull(),
  customerId: uuid("customer_id").notNull(),
  scheduledFor: timestamp("scheduled_for", { withTimezone: true }).notNull(),
  status: followupStatus("status").default("pending").notNull(),
  channel: messageChannel("channel").notNull(),
  templateId: uuid("template_id"),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  lastError: text("last_error"),
});
