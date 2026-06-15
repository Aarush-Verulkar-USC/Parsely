import { ISO_4217 } from "@/lib/iso4217";
import type {
  Extraction,
  FieldMeta,
  FieldMetadata,
  FieldStatus,
} from "@/lib/types";

// Floating-point rounding in monetary arithmetic never produces a false failure.
const MONEY_TOLERANCE = 0.01;

export const OK_CONFIDENCE_THRESHOLD = 0.85;

export const RULE_MESSAGES: Record<string, string> = {
  lineItemsSumToSubtotal: "Line items do not sum to the subtotal.",
  subtotalPlusTaxEqualsTotal: "Subtotal plus tax does not equal the total.",
  lineTotalMatchesQuantityTimesPrice:
    "Quantity times unit price does not equal the line total.",
  issueBeforeDue: "The issue date is after the due date.",
  currencyValid: "The currency is not a valid ISO 4217 code.",
  totalPositive: "The total is not greater than zero.",
  invoiceNumberPresent: "The invoice number is missing.",
};

function approxEqual(a: number, b: number): boolean {
  return Math.abs(a - b) <= MONEY_TOLERANCE + 1e-9;
}

export function enumerateFieldPaths(data: Extraction): string[] {
  const paths = [
    "invoiceNumber",
    "issueDate",
    "dueDate",
    "poNumber",
    "currency",
    "vendor.name",
    "vendor.address",
    "vendor.taxId",
    "buyer.name",
    "buyer.address",
  ];
  data.lineItems.forEach((_, i) => {
    paths.push(
      `lineItems.${i}.description`,
      `lineItems.${i}.quantity`,
      `lineItems.${i}.unitPrice`,
      `lineItems.${i}.lineTotal`,
    );
  });
  paths.push(
    "totals.subtotal",
    "totals.taxAmount",
    "totals.taxRate",
    "totals.total",
  );
  return paths;
}

export function runValidations(data: Extraction): Record<string, string[]> {
  const failures: Record<string, string[]> = {};
  const taint = (path: string, rule: string) => {
    (failures[path] ??= []).push(rule);
  };

  const lineSum = data.lineItems.reduce((s, li) => s + li.lineTotal, 0);
  if (!approxEqual(lineSum, data.totals.subtotal)) {
    taint("totals.subtotal", "lineItemsSumToSubtotal");
    data.lineItems.forEach((_, i) =>
      taint(`lineItems.${i}.lineTotal`, "lineItemsSumToSubtotal"),
    );
  }

  if (!approxEqual(data.totals.subtotal + data.totals.taxAmount, data.totals.total)) {
    taint("totals.total", "subtotalPlusTaxEqualsTotal");
    taint("totals.subtotal", "subtotalPlusTaxEqualsTotal");
    taint("totals.taxAmount", "subtotalPlusTaxEqualsTotal");
  }

  data.lineItems.forEach((li, i) => {
    if (!approxEqual(li.quantity * li.unitPrice, li.lineTotal)) {
      taint(`lineItems.${i}.lineTotal`, "lineTotalMatchesQuantityTimesPrice");
      taint(`lineItems.${i}.quantity`, "lineTotalMatchesQuantityTimesPrice");
      taint(`lineItems.${i}.unitPrice`, "lineTotalMatchesQuantityTimesPrice");
    }
  });

  if (data.dueDate) {
    const issue = Date.parse(data.issueDate);
    const due = Date.parse(data.dueDate);
    if (!Number.isNaN(issue) && !Number.isNaN(due) && issue > due) {
      taint("issueDate", "issueBeforeDue");
      taint("dueDate", "issueBeforeDue");
    }
  }

  if (!ISO_4217.has(data.currency.toUpperCase())) {
    taint("currency", "currencyValid");
  }

  if (!(data.totals.total > 0)) {
    taint("totals.total", "totalPositive");
  }

  if (data.invoiceNumber.trim() === "") {
    taint("invoiceNumber", "invoiceNumberPresent");
  }

  return failures;
}

export function confidenceFromMetadata(
  meta: FieldMetadata,
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [path, m] of Object.entries(meta)) out[path] = m.confidence;
  return out;
}

function deriveStatus(failed: string[], confidence: number): FieldStatus {
  if (failed.length > 0) return "error";
  return confidence >= OK_CONFIDENCE_THRESHOLD ? "ok" : "warn";
}

export function scoreExtraction(
  data: Extraction,
  confidence: Record<string, number> = {},
): FieldMetadata {
  const failures = runValidations(data);
  const metadata: FieldMetadata = {};

  for (const path of enumerateFieldPaths(data)) {
    const failed = failures[path] ?? [];
    const conf = confidence[path] ?? 1;
    const meta: FieldMeta = {
      confidence: conf,
      status: deriveStatus(failed, conf),
      validations: failed,
      corrected: false,
    };
    metadata[path] = meta;
  }

  return metadata;
}
