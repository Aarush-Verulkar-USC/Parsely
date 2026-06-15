import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { extractions, invoices } from "@/db/schema";
import { error } from "@/lib/http";
import { getInvoiceForUser } from "@/lib/invoices";
import { requireUser } from "@/lib/session";
import {
  confidenceFromMetadata,
  RULE_MESSAGES,
  scoreExtraction,
} from "@/lib/trust";
import type { Extraction } from "@/lib/types";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  let user;
  try {
    user = await requireUser(request);
  } catch (res) {
    return res as Response;
  }

  const { id } = await params;
  const record = await getInvoiceForUser(id, user.userId);
  if (!record || !record.extraction) return error("Not found", 404);
  if (record.invoice.status === "approved" || record.invoice.status === "exported") {
    return error("Invoice is already approved", 409);
  }
  if (record.invoice.status !== "needs_review") {
    return error(`Invoice is ${record.invoice.status} and cannot be approved`, 409);
  }

  const meta = scoreExtraction(
    record.extraction.reviewedData as Extraction,
    confidenceFromMetadata(record.extraction.fieldMetadata),
  );
  for (const path of Object.keys(meta)) {
    meta[path].corrected = record.extraction.fieldMetadata[path]?.corrected ?? false;
  }

  const errors = Object.entries(meta)
    .filter(([, m]) => m.status === "error")
    .map(([path, m]) => ({
      fieldPath: path,
      rules: m.validations,
      messages: m.validations.map((r) => RULE_MESSAGES[r] ?? r),
    }));

  if (errors.length > 0) {
    return NextResponse.json(
      { error: "Resolve all validation errors before approving", fields: errors },
      { status: 422 },
    );
  }

  await db.transaction(async (tx) => {
    await tx
      .update(extractions)
      .set({ fieldMetadata: meta })
      .where(eq(extractions.invoiceId, id));
    await tx
      .update(invoices)
      .set({ status: "approved", updatedAt: new Date() })
      .where(eq(invoices.id, id));
  });

  return NextResponse.json({ id, status: "approved" });
}
