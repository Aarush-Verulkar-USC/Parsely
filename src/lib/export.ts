import type { Extraction } from "@/lib/types";

export function toJson(data: Extraction): string {
  return JSON.stringify(data, null, 2);
}

const HEADERS = [
  "invoiceNumber",
  "issueDate",
  "dueDate",
  "poNumber",
  "currency",
  "vendorName",
  "vendorAddress",
  "vendorTaxId",
  "buyerName",
  "buyerAddress",
  "lineDescription",
  "lineQuantity",
  "lineUnitPrice",
  "lineTotal",
  "subtotal",
  "taxAmount",
  "taxRate",
  "total",
] as const;

function csvCell(value: unknown): string {
  const s = value === null || value === undefined ? "" : String(value);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(data: Extraction): string {
  const base = {
    invoiceNumber: data.invoiceNumber,
    issueDate: data.issueDate,
    dueDate: data.dueDate,
    poNumber: data.poNumber,
    currency: data.currency,
    vendorName: data.vendor.name,
    vendorAddress: data.vendor.address,
    vendorTaxId: data.vendor.taxId,
    buyerName: data.buyer.name,
    buyerAddress: data.buyer.address,
    subtotal: data.totals.subtotal,
    taxAmount: data.totals.taxAmount,
    taxRate: data.totals.taxRate,
    total: data.totals.total,
  };

  const lines = data.lineItems.length > 0
    ? data.lineItems
    : [{ description: "", quantity: "", unitPrice: "", lineTotal: "" }];

  const rows = lines.map((li) =>
    ({
      ...base,
      lineDescription: li.description,
      lineQuantity: li.quantity,
      lineUnitPrice: li.unitPrice,
      lineTotal: li.lineTotal,
    } as Record<string, unknown>),
  );

  const out = [HEADERS.join(",")];
  for (const row of rows) {
    out.push(HEADERS.map((h) => csvCell(row[h])).join(","));
  }
  return out.join("\r\n");
}

export function exportFilename(data: Extraction, ext: string): string {
  const stem = (data.invoiceNumber || "invoice").replace(/[^a-zA-Z0-9._-]+/g, "_");
  return `${stem}.${ext}`;
}
