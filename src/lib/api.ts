// Browser-side helpers for the Parsely API. Same-origin, cookie-authed.
import type { Extraction, FieldMetadata, InvoiceStatus } from "@/lib/types";

async function json<T>(res: Response): Promise<T> {
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw Object.assign(new Error((body as { error?: string }).error ?? res.statusText), {
      status: res.status,
      body,
    });
  }
  return body as T;
}

export async function me(): Promise<{ user: { userId: string; email: string } }> {
  return json(await fetch("/auth/me"));
}

export async function login(email: string, password: string) {
  return json(
    await fetch("/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, password }),
    }),
  );
}

export async function register(email: string, password: string) {
  return json(
    await fetch("/auth/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, password }),
    }),
  );
}

export async function logout() {
  await fetch("/auth/logout", { method: "POST" });
}

export interface InvoiceListItem {
  id: string;
  originalFilename: string;
  status: InvoiceStatus;
  pageCount: number | null;
  createdAt: string;
}

export async function listInvoices(status?: string): Promise<InvoiceListItem[]> {
  const qs = status ? `?status=${encodeURIComponent(status)}` : "";
  const { invoices } = await json<{ invoices: InvoiceListItem[] }>(
    await fetch(`/invoices${qs}`),
  );
  return invoices;
}

export async function uploadInvoice(file: File): Promise<{ id: string }> {
  const form = new FormData();
  form.append("file", file);
  return json(await fetch("/invoices", { method: "POST", body: form }));
}

export interface InvoiceRecord {
  invoice: {
    id: string;
    originalFilename: string;
    mimeType: string;
    pageCount: number | null;
    status: InvoiceStatus;
    errorMessage: string | null;
  };
  extraction: {
    modelName: string;
    promptVersion: string;
    extractedData: Extraction;
    reviewedData: Extraction;
    fieldMetadata: FieldMetadata;
  } | null;
  ruleMessages: Record<string, string>;
}

export async function getInvoice(id: string): Promise<InvoiceRecord> {
  return json(await fetch(`/invoices/${id}`));
}

export async function patchFields(
  id: string,
  corrections: { fieldPath: string; value: unknown }[],
): Promise<{ reviewedData: Extraction; fieldMetadata: FieldMetadata }> {
  return json(
    await fetch(`/invoices/${id}/fields`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ corrections }),
    }),
  );
}

export async function approve(id: string): Promise<{ status: InvoiceStatus }> {
  return json(
    await fetch(`/invoices/${id}/approve`, { method: "POST" }),
  );
}
