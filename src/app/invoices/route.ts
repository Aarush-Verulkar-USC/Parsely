import { after, NextResponse } from "next/server";
import { and, desc, eq } from "drizzle-orm";

import { db } from "@/db";
import { invoices, invoiceStatus } from "@/db/schema";
import type { InvoiceStatus } from "@/lib/types";
import { error } from "@/lib/http";
import { processInvoice } from "@/lib/processing";
import { requireUser } from "@/lib/session";
import { isSupportedMime, SUPPORTED_MIME_TYPES, storeOriginal } from "@/lib/storage";

const MAX_BYTES = 20 * 1024 * 1024;

export async function POST(request: Request) {
  let user;
  try {
    user = await requireUser(request);
  } catch (res) {
    return res as Response;
  }

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return error("Expected a multipart form with a 'file' field", 400);
  }
  if (!isSupportedMime(file.type)) {
    return error(
      `Unsupported file type '${file.type}'. Supported: ${SUPPORTED_MIME_TYPES.join(", ")}`,
      415,
    );
  }
  if (file.size > MAX_BYTES) {
    return error("File exceeds the 20 MB limit", 413);
  }

  const bytes = Buffer.from(await file.arrayBuffer());

  const [invoice] = await db
    .insert(invoices)
    .values({
      userId: user.userId,
      originalFilename: file.name,
      storagePath: "",
      mimeType: file.type,
      status: "uploaded",
    })
    .returning({ id: invoices.id });

  const storagePath = await storeOriginal(invoice.id, file.type, bytes);
  await db
    .update(invoices)
    .set({ storagePath })
    .where(eq(invoices.id, invoice.id));

  after(() => processInvoice(invoice.id));

  return NextResponse.json({ id: invoice.id, status: "uploaded" }, { status: 202 });
}

export async function GET(request: Request) {
  let user;
  try {
    user = await requireUser(request);
  } catch (res) {
    return res as Response;
  }

  const statusParam = new URL(request.url).searchParams.get("status");
  const statusFilter = invoiceStatus.enumValues.includes(
    statusParam as InvoiceStatus,
  )
    ? (statusParam as InvoiceStatus)
    : undefined;

  const rows = await db
    .select({
      id: invoices.id,
      originalFilename: invoices.originalFilename,
      status: invoices.status,
      pageCount: invoices.pageCount,
      createdAt: invoices.createdAt,
    })
    .from(invoices)
    .where(
      and(
        eq(invoices.userId, user.userId),
        statusFilter ? eq(invoices.status, statusFilter) : undefined,
      ),
    )
    .orderBy(desc(invoices.createdAt));

  return NextResponse.json({ invoices: rows });
}
