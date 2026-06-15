import { eq } from "drizzle-orm";
import { PDFDocument } from "pdf-lib";

import { db } from "@/db";
import { extractions, invoices } from "@/db/schema";
import { extractInvoice } from "@/lib/extraction";
import { readOriginal } from "@/lib/storage";
import { scoreExtraction } from "@/lib/trust";

async function pageCount(mimeType: string, bytes: Buffer): Promise<number> {
  if (mimeType !== "application/pdf") return 1;
  try {
    const doc = await PDFDocument.load(bytes, { updateMetadata: false });
    return doc.getPageCount();
  } catch {
    return 1;
  }
}

export async function processInvoice(invoiceId: string): Promise<void> {
  const [invoice] = await db
    .select()
    .from(invoices)
    .where(eq(invoices.id, invoiceId));
  if (!invoice) return;

  await db
    .update(invoices)
    .set({ status: "processing", updatedAt: new Date() })
    .where(eq(invoices.id, invoiceId));

  try {
    const bytes = await readOriginal(invoice.storagePath);
    const pages = await pageCount(invoice.mimeType, bytes);
    const { data, modelName, confidence } = await extractInvoice(
      invoice.mimeType,
      bytes,
    );

    const fieldMetadata = scoreExtraction(data, confidence);

    await db.insert(extractions).values({
      invoiceId,
      modelName,
      promptVersion: process.env.PROMPT_VERSION ?? "v1",
      extractedData: data,
      reviewedData: data,
      fieldMetadata,
    });

    await db
      .update(invoices)
      .set({ status: "needs_review", pageCount: pages, updatedAt: new Date() })
      .where(eq(invoices.id, invoiceId));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Extraction failed";
    await db
      .update(invoices)
      .set({ status: "failed", errorMessage: message, updatedAt: new Date() })
      .where(eq(invoices.id, invoiceId));
  }
}
