export interface LineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface Extraction {
  invoiceNumber: string;
  issueDate: string;
  dueDate: string | null;
  poNumber: string | null;
  currency: string;

  vendor: {
    name: string;
    address: string | null;
    taxId: string | null;
  };
  buyer: {
    name: string | null;
    address: string | null;
  };

  lineItems: LineItem[];

  totals: {
    subtotal: number;
    taxAmount: number;
    taxRate: number | null;
    total: number;
  };
}

export type FieldStatus = "ok" | "warn" | "error";

export interface FieldMeta {
  confidence: number;
  status: FieldStatus;
  validations: string[];
  corrected: boolean;
}

export type FieldMetadata = Record<string, FieldMeta>;

export type InvoiceStatus =
  | "uploaded"
  | "processing"
  | "needs_review"
  | "approved"
  | "exported"
  | "failed";
