import type { InvoiceStatus } from "@/lib/types";

const STYLES: Record<InvoiceStatus, { badge: string; dot: string }> = {
  uploaded: { badge: "bg-slate-100 text-slate-600 ring-slate-200", dot: "bg-slate-400" },
  processing: { badge: "bg-sky-50 text-sky-700 ring-sky-200", dot: "bg-sky-500 animate-pulse" },
  needs_review: { badge: "bg-amber-50 text-amber-700 ring-amber-200", dot: "bg-amber-500" },
  approved: { badge: "bg-emerald-50 text-emerald-700 ring-emerald-200", dot: "bg-emerald-500" },
  exported: { badge: "bg-emerald-50 text-emerald-700 ring-emerald-200", dot: "bg-emerald-500" },
  failed: { badge: "bg-rose-50 text-rose-700 ring-rose-200", dot: "bg-rose-500" },
};

const LABELS: Record<InvoiceStatus, string> = {
  uploaded: "Uploaded",
  processing: "Processing",
  needs_review: "Needs review",
  approved: "Approved",
  exported: "Exported",
  failed: "Failed",
};

export function StatusBadge({ status }: { status: InvoiceStatus }) {
  const s = STYLES[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${s.badge}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {LABELS[status]}
    </span>
  );
}
