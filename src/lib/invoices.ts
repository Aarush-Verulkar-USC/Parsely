import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { extractions, invoices } from "@/db/schema";
import type { ExtractionRow, Invoice } from "@/db/schema";

export interface InvoiceRecord {
  invoice: Invoice;
  extraction: ExtractionRow | null;
}

export async function getInvoiceForUser(
  id: string,
  userId: string,
): Promise<InvoiceRecord | null> {
  const [invoice] = await db
    .select()
    .from(invoices)
    .where(and(eq(invoices.id, id), eq(invoices.userId, userId)));
  if (!invoice) return null;

  const [extraction] = await db
    .select()
    .from(extractions)
    .where(eq(extractions.invoiceId, id));

  return { invoice, extraction: extraction ?? null };
}
