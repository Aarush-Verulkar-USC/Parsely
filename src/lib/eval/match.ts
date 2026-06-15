import type { Extraction, LineItem } from "@/lib/types";

// What counts as a "match" depends on the field type, so that "1,200.00" vs
// "1200.0" or "USD " vs "usd" are not treated as errors.
export type FieldKind = "id" | "date" | "amount" | "name" | "currency";

const AMOUNT_TOLERANCE = 0.01;

function normalizeText(s: string): string {
  return s.toLowerCase().replace(/\s+/g, " ").trim();
}

function canonicalDate(s: string): string {
  const t = Date.parse(s);
  if (Number.isNaN(t)) return normalizeText(s);
  return new Date(t).toISOString().slice(0, 10);
}

/** Compare a single scalar value by field kind. Null/undefined match only each other. */
export function matchScalar(kind: FieldKind, pred: unknown, truth: unknown): boolean {
  const pNull = pred === null || pred === undefined || pred === "";
  const tNull = truth === null || truth === undefined || truth === "";
  if (pNull || tNull) return pNull && tNull;

  switch (kind) {
    case "id":
      return String(pred).trim() === String(truth).trim();
    case "currency":
      return String(pred).trim().toUpperCase() === String(truth).trim().toUpperCase();
    case "name":
      return normalizeText(String(pred)) === normalizeText(String(truth));
    case "date":
      return canonicalDate(String(pred)) === canonicalDate(String(truth));
    case "amount":
      return Math.abs(Number(pred) - Number(truth)) <= AMOUNT_TOLERANCE + 1e-9;
  }
}

// Header field paths and their kinds.
const HEADER_FIELDS: { path: string; kind: FieldKind }[] = [
  { path: "invoiceNumber", kind: "id" },
  { path: "issueDate", kind: "date" },
  { path: "dueDate", kind: "date" },
  { path: "poNumber", kind: "id" },
  { path: "currency", kind: "currency" },
  { path: "vendor.name", kind: "name" },
  { path: "vendor.address", kind: "name" },
  { path: "vendor.taxId", kind: "id" },
  { path: "buyer.name", kind: "name" },
  { path: "buyer.address", kind: "name" },
  { path: "totals.subtotal", kind: "amount" },
  { path: "totals.taxAmount", kind: "amount" },
  { path: "totals.taxRate", kind: "amount" },
  { path: "totals.total", kind: "amount" },
];

const LINE_CELLS: { key: keyof LineItem; kind: FieldKind }[] = [
  { key: "description", kind: "name" },
  { key: "quantity", kind: "amount" },
  { key: "unitPrice", kind: "amount" },
  { key: "lineTotal", kind: "amount" },
];

function get(obj: Extraction, path: string): unknown {
  return path.split(".").reduce<unknown>(
    (cur, seg) => (cur && typeof cur === "object" ? (cur as Record<string, unknown>)[seg] : undefined),
    obj,
  );
}

export interface FieldResult {
  path: string;
  kind: FieldKind;
  correct: boolean;
}

export interface MatchResult {
  fields: FieldResult[];
  correct: number;
  total: number;
  rowCountMatch: boolean;
  matchedRows: number;
  expectedRows: number;
  predictedRows: number;
}

/** Similarity used to align a predicted line item to a ground-truth one. */
function rowSimilarity(pred: LineItem, truth: LineItem): number {
  let score = 0;
  for (const { key, kind } of LINE_CELLS) {
    if (matchScalar(kind, pred[key], truth[key])) score++;
  }
  return score;
}

/**
 * Align predicted rows to ground-truth rows (greedy, best similarity first),
 * then score each cell of every ground-truth row. Unmatched truth rows score
 * all their cells as wrong.
 */
function matchLineItems(pred: LineItem[], truth: LineItem[]): {
  fields: FieldResult[];
  matchedRows: number;
} {
  const usedPred = new Set<number>();
  const fields: FieldResult[] = [];
  let matchedRows = 0;

  truth.forEach((tRow, ti) => {
    let best = -1;
    let bestScore = -1;
    pred.forEach((pRow, pi) => {
      if (usedPred.has(pi)) return;
      const s = rowSimilarity(pRow, tRow);
      if (s > bestScore) {
        bestScore = s;
        best = pi;
      }
    });

    const pRow = best >= 0 ? pred[best] : undefined;
    if (pRow && bestScore > 0) {
      usedPred.add(best);
      matchedRows++;
    }
    for (const { key, kind } of LINE_CELLS) {
      const correct = pRow ? matchScalar(kind, pRow[key], tRow[key]) : false;
      fields.push({ path: `lineItems.${ti}.${String(key)}`, kind, correct });
    }
  });

  return { fields, matchedRows };
}

/** Score a predicted extraction against ground truth. */
export function matchExtraction(pred: Extraction, truth: Extraction): MatchResult {
  const headerFields = HEADER_FIELDS.map(({ path, kind }) => ({
    path,
    kind,
    correct: matchScalar(kind, get(pred, path), get(truth, path)),
  }));

  const { fields: lineFields, matchedRows } = matchLineItems(
    pred.lineItems,
    truth.lineItems,
  );

  const fields = [...headerFields, ...lineFields];
  const correct = fields.filter((f) => f.correct).length;

  return {
    fields,
    correct,
    total: fields.length,
    rowCountMatch: pred.lineItems.length === truth.lineItems.length,
    matchedRows,
    expectedRows: truth.lineItems.length,
    predictedRows: pred.lineItems.length,
  };
}
