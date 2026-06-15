import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import { extractInvoice } from "@/lib/extraction";
import { matchExtraction, type FieldKind } from "@/lib/eval/match";
import type { Extraction } from "@/lib/types";

function loadEnv() {
  try {
    const text = readFileSync(path.join(process.cwd(), ".env"), "utf8");
    for (const line of text.split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2];
    }
  } catch {
    /* no .env */
  }
}

const MIME: Record<string, string> = {
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
};

interface GroundTruth {
  file: string;
  layoutLabel: string;
  expected: Extraction;
}

function pct(correct: number, total: number): string {
  return total === 0 ? "—" : `${((100 * correct) / total).toFixed(1)}%`;
}

async function main() {
  loadEnv();
  const dir = path.join(process.cwd(), "eval", "dataset");
  const files = readdirSync(dir).filter((f) => f.endsWith(".json"));
  if (files.length === 0) {
    console.error("No ground-truth files in eval/dataset");
    process.exit(1);
  }

  const byLayout = new Map<string, { correct: number; total: number }>();
  const byKind = new Map<FieldKind, { correct: number; total: number }>();
  let overallCorrect = 0;
  let overallTotal = 0;

  console.log("Per-invoice results\n" + "-".repeat(64));

  for (const f of files.sort()) {
    const gt = JSON.parse(readFileSync(path.join(dir, f), "utf8")) as GroundTruth;
    const bytes = readFileSync(path.join(dir, gt.file));
    const mime = MIME[path.extname(gt.file).toLowerCase()] ?? "application/pdf";

    const { data } = await extractInvoice(mime, Buffer.from(bytes));
    const result = matchExtraction(data, gt.expected);

    overallCorrect += result.correct;
    overallTotal += result.total;

    const layout = byLayout.get(gt.layoutLabel) ?? { correct: 0, total: 0 };
    layout.correct += result.correct;
    layout.total += result.total;
    byLayout.set(gt.layoutLabel, layout);

    for (const field of result.fields) {
      const k = byKind.get(field.kind) ?? { correct: 0, total: 0 };
      k.correct += field.correct ? 1 : 0;
      k.total += 1;
      byKind.set(field.kind, k);
    }

    const rows = `rows ${result.matchedRows}/${result.expectedRows}` +
      (result.predictedRows !== result.expectedRows ? ` (pred ${result.predictedRows})` : "");
    console.log(
      `  ${f.replace(/\.json$/, "").padEnd(14)} [${gt.layoutLabel.padEnd(8)}] ` +
        `${pct(result.correct, result.total).padStart(6)}  ${result.correct}/${result.total}  ${rows}`,
    );
  }

  console.log("\nPer-layout accuracy\n" + "-".repeat(64));
  for (const [layout, agg] of [...byLayout].sort()) {
    console.log(`  ${layout.padEnd(12)} ${pct(agg.correct, agg.total).padStart(6)}  (${agg.correct}/${agg.total})`);
  }

  console.log("\nPer-field-type accuracy\n" + "-".repeat(64));
  for (const [kind, agg] of [...byKind].sort()) {
    console.log(`  ${kind.padEnd(12)} ${pct(agg.correct, agg.total).padStart(6)}  (${agg.correct}/${agg.total})`);
  }

  console.log("\n" + "=".repeat(64));
  console.log(`  OVERALL      ${pct(overallCorrect, overallTotal).padStart(6)}  (${overallCorrect}/${overallTotal})`);
  console.log("=".repeat(64));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
