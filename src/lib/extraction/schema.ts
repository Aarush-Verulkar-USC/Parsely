import { z } from "zod";

import type { Extraction } from "@/lib/types";

export const lineItemSchema = z.object({
  description: z.string(),
  quantity: z.number(),
  unitPrice: z.number(),
  lineTotal: z.number(),
});

export const extractionSchema = z.object({
  invoiceNumber: z.string(),
  issueDate: z.string(),
  dueDate: z.string().nullable(),
  poNumber: z.string().nullable(),
  currency: z.string(),

  vendor: z.object({
    name: z.string(),
    address: z.string().nullable(),
    taxId: z.string().nullable(),
  }),
  buyer: z.object({
    name: z.string().nullable(),
    address: z.string().nullable(),
  }),

  lineItems: z.array(lineItemSchema),

  totals: z.object({
    subtotal: z.number(),
    taxAmount: z.number(),
    taxRate: z.number().nullable(),
    total: z.number(),
  }),
});

type _Check = Extraction extends z.infer<typeof extractionSchema>
  ? z.infer<typeof extractionSchema> extends Extraction
    ? true
    : never
  : never;
const _typeCheck: _Check = true;
void _typeCheck;

const lineItemConfidence = z.object({
  description: z.number(),
  quantity: z.number(),
  unitPrice: z.number(),
  lineTotal: z.number(),
});

export const confidenceSchema = z.object({
  invoiceNumber: z.number(),
  issueDate: z.number(),
  dueDate: z.number(),
  poNumber: z.number(),
  currency: z.number(),
  vendor: z.object({ name: z.number(), address: z.number(), taxId: z.number() }),
  buyer: z.object({ name: z.number(), address: z.number() }),
  lineItems: z.array(lineItemConfidence),
  totals: z.object({
    subtotal: z.number(),
    taxAmount: z.number(),
    taxRate: z.number(),
    total: z.number(),
  }),
});

export type ConfidenceShape = z.infer<typeof confidenceSchema>;

export const extractionWithConfidenceSchema = z.object({
  data: extractionSchema,
  confidence: confidenceSchema,
});

export function flattenConfidence(c: ConfidenceShape): Record<string, number> {
  const out: Record<string, number> = {
    invoiceNumber: c.invoiceNumber,
    issueDate: c.issueDate,
    dueDate: c.dueDate,
    poNumber: c.poNumber,
    currency: c.currency,
    "vendor.name": c.vendor.name,
    "vendor.address": c.vendor.address,
    "vendor.taxId": c.vendor.taxId,
    "buyer.name": c.buyer.name,
    "buyer.address": c.buyer.address,
    "totals.subtotal": c.totals.subtotal,
    "totals.taxAmount": c.totals.taxAmount,
    "totals.taxRate": c.totals.taxRate,
    "totals.total": c.totals.total,
  };
  c.lineItems.forEach((li, i) => {
    out[`lineItems.${i}.description`] = li.description;
    out[`lineItems.${i}.quantity`] = li.quantity;
    out[`lineItems.${i}.unitPrice`] = li.unitPrice;
    out[`lineItems.${i}.lineTotal`] = li.lineTotal;
  });
  return out;
}
