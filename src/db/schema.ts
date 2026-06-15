import {
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import type {
  Extraction,
  FieldMetadata,
  InvoiceStatus,
} from "@/lib/types";

export const invoiceStatus = pgEnum("invoice_status", [
  "uploaded",
  "processing",
  "needs_review",
  "approved",
  "exported",
  "failed",
]);

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const invoices = pgTable("invoices", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  originalFilename: text("original_filename").notNull(),
  storagePath: text("storage_path").notNull(),
  mimeType: text("mime_type").notNull(),
  pageCount: integer("page_count"),
  layoutLabel: text("layout_label"),
  status: invoiceStatus("status").notNull().default("uploaded"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const extractions = pgTable("extractions", {
  id: uuid("id").defaultRandom().primaryKey(),
  invoiceId: uuid("invoice_id")
    .notNull()
    .unique()
    .references(() => invoices.id),
  modelName: text("model_name").notNull(),
  promptVersion: text("prompt_version").notNull(),
  extractedData: jsonb("extracted_data").$type<Extraction>().notNull(),
  reviewedData: jsonb("reviewed_data").$type<Extraction>().notNull(),
  fieldMetadata: jsonb("field_metadata").$type<FieldMetadata>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const corrections = pgTable("corrections", {
  id: uuid("id").defaultRandom().primaryKey(),
  invoiceId: uuid("invoice_id")
    .notNull()
    .references(() => invoices.id),
  fieldPath: text("field_path").notNull(),
  oldValue: jsonb("old_value"),
  newValue: jsonb("new_value"),
  correctedBy: uuid("corrected_by")
    .notNull()
    .references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export type User = typeof users.$inferSelect;
export type Invoice = typeof invoices.$inferSelect;
export type ExtractionRow = typeof extractions.$inferSelect;
export type CorrectionRow = typeof corrections.$inferSelect;
export type { InvoiceStatus };
