import { sql } from "drizzle-orm";
import {
  bigint,
  bigserial,
  boolean,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import type { PricingConfig, QuotationOptions, QuotationResult } from "@/lib/pricing/types";
import type { LeadSource, LeadStatus, ProjectCategory, SiteVisitStatus } from "@/lib/constants";

export * from "@/lib/constants";

const money = (name: string) => bigint(name, { mode: "number" });
const sqm = (name: string) => numeric(name, { precision: 12, scale: 2, mode: "number" });
const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const updatedAt = () => timestamp("updated_at", { withTimezone: true }).notNull().defaultNow();

/* ------------------------------------------------------------------ */
/* Users & audit                                                       */
/* ------------------------------------------------------------------ */

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull(),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").$type<"admin" | "staff">().notNull().default("staff"),
  active: boolean("active").notNull().default(true),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (t) => [uniqueIndex("users_email_uq").on(sql`lower(${t.email})`)]);

export const auditLogs = pgTable("audit_logs", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  actorUserId: uuid("actor_user_id").references(() => users.id, { onDelete: "set null" }),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id"),
  details: jsonb("details").$type<Record<string, unknown>>(),
  ipAddress: text("ip_address"),
  createdAt: createdAt(),
}, (t) => [
  index("audit_logs_entity_idx").on(t.entityType, t.entityId),
  index("audit_logs_created_idx").on(t.createdAt),
]);

/* ------------------------------------------------------------------ */
/* Pricing                                                             */
/* ------------------------------------------------------------------ */

/** Current pricing. Exactly one row (id = 1). */
export const pricingConfig = pgTable("pricing_config", {
  id: integer("id").primaryKey().default(1),
  version: integer("version").notNull(),
  values: jsonb("values").$type<PricingConfig>().notNull(),
  updatedBy: uuid("updated_by").references(() => users.id, { onDelete: "set null" }),
  updatedAt: updatedAt(),
});

/** Append-only: every pricing version ever used. Quotations reference a version. */
export const pricingHistory = pgTable("pricing_history", {
  version: integer("version").primaryKey(),
  values: jsonb("values").$type<PricingConfig>().notNull(),
  changeNote: text("change_note"),
  changedBy: uuid("changed_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: createdAt(),
});

/* ------------------------------------------------------------------ */
/* Customers, quotations, leads                                        */
/* ------------------------------------------------------------------ */

export const customers = pgTable("customers", {
  id: uuid("id").primaryKey().defaultRandom(),
  fullName: text("full_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  whatsapp: text("whatsapp"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (t) => [index("customers_email_idx").on(sql`lower(${t.email})`)]);

/** Per-year counter that backs human-readable quote numbers (MP-Q-2026-00001). */
export const quoteCounters = pgTable("quote_counters", {
  year: integer("year").primaryKey(),
  lastSeq: integer("last_seq").notNull(),
});

export type EmailStatus = "pending" | "sent" | "failed";

export const quotations = pgTable("quotations", {
  id: uuid("id").primaryKey().defaultRandom(),
  quoteNumber: text("quote_number").notNull(),
  customerId: uuid("customer_id").notNull().references(() => customers.id),
  /** Client-generated key so a retried submission never creates a duplicate. */
  idempotencyKey: text("idempotency_key").notNull(),
  /** Secret used in the customer's PDF download / follow-up links. */
  accessToken: text("access_token").notNull(),

  squareMetres: sqm("square_metres").notNull(),
  options: jsonb("options").$type<QuotationOptions>().notNull(),
  projectLocation: text("project_location").notNull(),
  projectType: text("project_type"),
  paverStyle: text("paver_style"),
  expectedStartDate: date("expected_start_date"),
  notes: text("notes"),

  pricingVersion: integer("pricing_version").notNull().references(() => pricingHistory.version),
  /** Snapshot of the exact rates used, so the quote can always be reproduced. */
  pricingSnapshot: jsonb("pricing_snapshot").$type<PricingConfig>().notNull(),
  result: jsonb("result").$type<QuotationResult>().notNull(),
  grandTotal: money("grand_total").notNull(),
  validUntil: date("valid_until").notNull(),

  emailStatus: text("email_status").$type<EmailStatus>().notNull().default("pending"),
  emailAttempts: integer("email_attempts").notNull().default(0),
  emailLastError: text("email_last_error"),
  emailSentAt: timestamp("email_sent_at", { withTimezone: true }),

  /** First time the customer downloaded the PDF from the website. */
  downloadedAt: timestamp("downloaded_at", { withTimezone: true }),
  /** Set once the quotation has been written to the Google Sheet (one row per quotation). */
  sheetExportedAt: timestamp("sheet_exported_at", { withTimezone: true }),

  createdAt: createdAt(),
}, (t) => [
  uniqueIndex("quotations_number_uq").on(t.quoteNumber),
  uniqueIndex("quotations_idempotency_uq").on(t.idempotencyKey),
  index("quotations_customer_idx").on(t.customerId),
  index("quotations_created_idx").on(t.createdAt),
]);

export const quotationItems = pgTable("quotation_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  quotationId: uuid("quotation_id").notNull().references(() => quotations.id, { onDelete: "cascade" }),
  position: integer("position").notNull(),
  code: text("code").notNull(),
  description: text("description").notNull(),
  quantity: numeric("quantity", { precision: 12, scale: 2, mode: "number" }),
  unit: text("unit"),
  unitPrice: money("unit_price"),
  amount: money("amount"),
  note: text("note"),
}, (t) => [index("quotation_items_quote_idx").on(t.quotationId, t.position)]);



export const leads = pgTable("leads", {
  id: uuid("id").primaryKey().defaultRandom(),
  /** Short public-facing reference, e.g. L-7KQ2M9. */
  reference: text("reference").notNull(),
  customerId: uuid("customer_id").notNull().references(() => customers.id),
  quotationId: uuid("quotation_id").references(() => quotations.id, { onDelete: "set null" }),
  source: text("source").$type<LeadSource>().notNull(),
  status: text("status").$type<LeadStatus>().notNull().default("new"),
  location: text("location"),
  projectType: text("project_type"),
  squareMetres: sqm("square_metres"),
  estimatedValue: money("estimated_value"),
  message: text("message"),
  adminNotes: text("admin_notes"),
  siteVisitRequested: boolean("site_visit_requested").notNull().default(false),
  statusChangedAt: timestamp("status_changed_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (t) => [
  uniqueIndex("leads_reference_uq").on(t.reference),
  uniqueIndex("leads_quotation_uq").on(t.quotationId),
  index("leads_status_idx").on(t.status),
  index("leads_created_idx").on(t.createdAt),
  index("leads_location_idx").on(sql`lower(${t.location})`),
  index("leads_project_type_idx").on(t.projectType),
]);


export const siteVisitRequests = pgTable("site_visit_requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  leadId: uuid("lead_id").notNull().references(() => leads.id, { onDelete: "cascade" }),
  quotationId: uuid("quotation_id").references(() => quotations.id, { onDelete: "set null" }),
  location: text("location").notNull(),
  preferredDate: date("preferred_date"),
  preferredTime: text("preferred_time"),
  notes: text("notes"),
  status: text("status").$type<SiteVisitStatus>().notNull().default("requested"),
  scheduledFor: timestamp("scheduled_for", { withTimezone: true }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (t) => [
  index("site_visits_lead_idx").on(t.leadId),
  index("site_visits_status_idx").on(t.status, t.createdAt),
]);

/* ------------------------------------------------------------------ */
/* Portfolio                                                           */
/* ------------------------------------------------------------------ */


export const projects = pgTable("projects", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull(),
  name: text("name").notNull(),
  location: text("location").notNull(),
  categories: text("categories").array().$type<ProjectCategory[]>().notNull().default(sql`'{}'::text[]`),
  description: text("description").notNull().default(""),
  squareMetres: sqm("square_metres"),
  paverType: text("paver_type"),
  completionDate: date("completion_date"),
  featured: boolean("featured").notNull().default(false),
  published: boolean("published").notNull().default(true),
  /** Seeded demo content — shows an "illustration" badge until replaced. */
  isSample: boolean("is_sample").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (t) => [
  uniqueIndex("projects_slug_uq").on(t.slug),
  index("projects_listing_idx").on(t.published, t.featured, t.sortOrder),
]);

export type ProjectImageKind = "before" | "after" | "gallery";

export const projectImages = pgTable("project_images", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  kind: text("kind").$type<ProjectImageKind>().notNull(),
  url: text("url").notNull(),
  storageKey: text("storage_key"),
  alt: text("alt").notNull().default(""),
  width: integer("width"),
  height: integer("height"),
  position: integer("position").notNull().default(0),
  createdAt: createdAt(),
}, (t) => [index("project_images_project_idx").on(t.projectId, t.kind, t.position)]);

/* ------------------------------------------------------------------ */
/* Analytics                                                           */
/* ------------------------------------------------------------------ */

export const analyticsEvents = pgTable("analytics_events", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  name: text("name").notNull(),
  sessionId: text("session_id"),
  path: text("path"),
  properties: jsonb("properties").$type<Record<string, string | number | boolean>>(),
  createdAt: createdAt(),
}, (t) => [
  index("analytics_name_created_idx").on(t.name, t.createdAt),
  index("analytics_session_idx").on(t.sessionId),
]);

export type User = typeof users.$inferSelect;
export type Customer = typeof customers.$inferSelect;
export type Quotation = typeof quotations.$inferSelect;
export type QuotationItem = typeof quotationItems.$inferSelect;
export type Lead = typeof leads.$inferSelect;
export type Project = typeof projects.$inferSelect;
export type ProjectImage = typeof projectImages.$inferSelect;
export type SiteVisitRequest = typeof siteVisitRequests.$inferSelect;
