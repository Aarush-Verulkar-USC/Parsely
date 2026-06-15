import { NextResponse } from "next/server";

import { error } from "@/lib/http";
import { getInvoiceForUser } from "@/lib/invoices";
import { requireUser } from "@/lib/session";
import { RULE_MESSAGES } from "@/lib/trust";

export async function GET(
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
  if (!record) return error("Not found", 404);

  const { invoice, extraction } = record;
  return NextResponse.json({
    invoice: {
      id: invoice.id,
      originalFilename: invoice.originalFilename,
      mimeType: invoice.mimeType,
      pageCount: invoice.pageCount,
      status: invoice.status,
      errorMessage: invoice.errorMessage,
      createdAt: invoice.createdAt,
      updatedAt: invoice.updatedAt,
    },
    extraction: extraction
      ? {
          modelName: extraction.modelName,
          promptVersion: extraction.promptVersion,
          extractedData: extraction.extractedData,
          reviewedData: extraction.reviewedData,
          fieldMetadata: extraction.fieldMetadata,
        }
      : null,
    ruleMessages: RULE_MESSAGES,
  });
}
