import { mockExtraction } from "@/lib/extraction/mock";
import { runValidations, scoreExtraction } from "@/lib/trust";
import type { Extraction } from "@/lib/types";

let failures = 0;
function check(name: string, cond: boolean) {
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}`);
  if (!cond) failures++;
}

const clean = mockExtraction();
const cleanMeta = scoreExtraction(clean, { "vendor.address": 0.61, "buyer.address": 0.72 });
check("clean: no validation failures", Object.keys(runValidations(clean)).length === 0);
check("clean: totals.total ok", cleanMeta["totals.total"].status === "ok");
check("clean: vendor.address warn (low conf)", cleanMeta["vendor.address"].status === "warn");
check("clean: every path has metadata", Object.keys(cleanMeta).length === 22);

const broken: Extraction = {
  invoiceNumber: "",
  issueDate: "2026-03-01",
  dueDate: "2026-02-01",
  poNumber: null,
  currency: "ZZZ",
  vendor: { name: "X", address: null, taxId: null },
  buyer: { name: null, address: null },
  lineItems: [{ description: "a", quantity: 2, unitPrice: 10, lineTotal: 25 }],
  totals: { subtotal: 100, taxAmount: 5, taxRate: null, total: 0 },
};
const f = runValidations(broken);
const bMeta = scoreExtraction(broken);
check("broken: invoiceNumber error", bMeta["invoiceNumber"].status === "error");
check("broken: currency error", f["currency"]?.includes("currencyValid"));
check("broken: issue/due error", f["issueDate"]?.includes("issueBeforeDue") && f["dueDate"]?.includes("issueBeforeDue"));
check("broken: line qty*price error", f["lineItems.0.lineTotal"]?.includes("lineTotalMatchesQuantityTimesPrice"));
check("broken: line sum != subtotal", f["totals.subtotal"]?.includes("lineItemsSumToSubtotal"));
check("broken: subtotal+tax != total", f["totals.total"]?.includes("subtotalPlusTaxEqualsTotal"));
check("broken: total !> 0", f["totals.total"]?.includes("totalPositive"));

const tol: Extraction = {
  ...clean,
  lineItems: [{ description: "a", quantity: 3, unitPrice: 0.1, lineTotal: 0.3 }],
  totals: { subtotal: 0.3, taxAmount: 0, taxRate: null, total: 0.3 },
};
check("tolerance: 3 * 0.1 == 0.3 passes", Object.keys(runValidations(tol)).length === 0);

console.log(failures === 0 ? "\nALL PASS" : `\n${failures} FAILED`);
process.exit(failures === 0 ? 0 : 1);
