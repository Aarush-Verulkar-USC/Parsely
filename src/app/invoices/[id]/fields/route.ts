import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { corrections, extractions, invoices } from "@/db/schema";
import { extractionSchema } from "@/lib/extraction/schema";
import { error } from "@/lib/http";
import { getInvoiceForUser } from "@/lib/invoices";
import { getByPath, setByPath } from "@/lib/path";
import { requireUser } from "@/lib/session";
import {
  confidenceFromMetadata,
  enumerateFieldPaths,
  scoreExtraction,
} from "@/lib/trust";
import type { Extraction } from "@/lib/types";

const bodySchema = z.object({
  corrections: z
    .array(z.object({ fieldPath: z.string(), value: z.unknown() }))
    .min(1),
});

export async function PATCH(
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
  if (record.invoice.status !== "needs_review") {
    return error(
      `Invoice is ${record.invoice.status} and can no longer be edited`,
      409,
    );
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return error("Expected { corrections: [...] }", 400);

  const allowed = new Set(
    enumerateFieldPaths(record.extraction.reviewedData as Extraction),
  );
  for (const c of parsed.data.corrections) {
    if (!allowed.has(c.fieldPath)) {
      return error(`Unknown or non-editable field path: ${c.fieldPath}`, 400);
    }
  }

  const next = structuredClone(record.extraction.reviewedData) as Extraction;
  const edited: { fieldPath: string; oldValue: unknown; newValue: unknown }[] = [];
  for (const c of parsed.data.corrections) {
    const oldValue = getByPath(next, c.fieldPath);
    if (JSON.stringify(oldValue) === JSON.stringify(c.value)) continue;
    setByPath(next, c.fieldPath, c.value);
    edited.push({ fieldPath: c.fieldPath, oldValue, newValue: c.value });
  }

  const validated = extractionSchema.safeParse(next);
  if (!validated.success) {
    return error(
      `Correction produced invalid data: ${validated.error.issues[0]?.message ?? "schema mismatch"}`,
      400,
    );
  }

  if (edited.length === 0) {
    return NextResponse.json({
      reviewedData: record.extraction.reviewedData,
      fieldMetadata: record.extraction.fieldMetadata,
    });
  }

  const oldMeta = record.extraction.fieldMetadata;
  const newMeta = scoreExtraction(validated.data, confidenceFromMetadata(oldMeta));
  const editedPaths = new Set(edited.map((e) => e.fieldPath));
  for (const path of Object.keys(newMeta)) {
    newMeta[path].corrected =
      editedPaths.has(path) || (oldMeta[path]?.corrected ?? false);
  }

  await db.transaction(async (tx) => {
    await tx.insert(corrections).values(
      edited.map((e) => ({
        invoiceId: id,
        fieldPath: e.fieldPath,
        oldValue: e.oldValue,
        newValue: e.newValue,
        correctedBy: user.userId,
      })),
    );
    await tx
      .update(extractions)
      .set({ reviewedData: validated.data, fieldMetadata: newMeta })
      .where(eq(extractions.invoiceId, id));
    await tx
      .update(invoices)
      .set({ updatedAt: new Date() })
      .where(eq(invoices.id, id));
  });

  return NextResponse.json({
    reviewedData: validated.data,
    fieldMetadata: newMeta,
    correctedFields: edited.map((e) => e.fieldPath),
  });
}
