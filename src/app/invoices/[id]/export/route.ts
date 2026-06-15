import { eq } from "drizzle-orm";

import { db } from "@/db";
import { invoices } from "@/db/schema";
import { exportFilename, toCsv, toJson } from "@/lib/export";
import { error } from "@/lib/http";
import { getInvoiceForUser } from "@/lib/invoices";
import { requireUser } from "@/lib/session";
import type { Extraction } from "@/lib/types";

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
  if (!record || !record.extraction) return error("Not found", 404);

  if (record.invoice.status !== "approved" && record.invoice.status !== "exported") {
    return error(
      `Invoice is ${record.invoice.status}; only approved invoices can be exported`,
      409,
    );
  }

  const format = new URL(request.url).searchParams.get("format") ?? "json";
  if (format !== "csv" && format !== "json") {
    return error("format must be 'csv' or 'json'", 400);
  }

  const data = record.extraction.reviewedData as Extraction;
  const body = format === "csv" ? toCsv(data) : toJson(data);
  const contentType = format === "csv" ? "text/csv" : "application/json";

  if (record.invoice.status === "approved") {
    await db
      .update(invoices)
      .set({ status: "exported", updatedAt: new Date() })
      .where(eq(invoices.id, id));
  }

  return new Response(body, {
    headers: {
      "content-type": `${contentType}; charset=utf-8`,
      "content-disposition": `attachment; filename="${exportFilename(data, format)}"`,
    },
  });
}
