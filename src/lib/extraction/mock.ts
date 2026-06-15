import type { Extraction } from "@/lib/types";

export function mockExtraction(): Extraction {
  return {
    invoiceNumber: "INV-MOCK-001",
    issueDate: "2026-01-15",
    dueDate: "2026-02-14",
    poNumber: "PO-7782",
    currency: "USD",
    vendor: {
      name: "Acme Supply Co.",
      address: "100 Industrial Way, Springfield, IL 62704",
      taxId: "12-3456789",
    },
    buyer: {
      name: "Globex Corporation",
      address: "500 Market St, Metropolis, NY 10001",
    },
    lineItems: [
      { description: "Widget, standard", quantity: 10, unitPrice: 12.5, lineTotal: 125.0 },
      { description: "Gadget, deluxe", quantity: 3, unitPrice: 40.0, lineTotal: 120.0 },
    ],
    totals: {
      subtotal: 245.0,
      taxAmount: 19.6,
      taxRate: 0.08,
      total: 264.6,
    },
  };
}

export function mockConfidence(): Record<string, number> {
  return {
    "vendor.address": 0.61,
    "buyer.address": 0.72,
  };
}
