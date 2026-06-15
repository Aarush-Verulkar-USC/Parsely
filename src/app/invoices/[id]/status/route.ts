import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { invoices } from "@/db/schema";
import { error } from "@/lib/http";
import { requireUser } from "@/lib/session";

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
  const [row] = await db
    .select({ status: invoices.status, errorMessage: invoices.errorMessage })
    .from(invoices)
    .where(and(eq(invoices.id, id), eq(invoices.userId, user.userId)));

  if (!row) return error("Not found", 404);
  return NextResponse.json(row);
}
