"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { BrandMark } from "@/components/Brand";
import { StatusBadge } from "@/components/StatusBadge";
import { approve, getInvoice, patchFields, type InvoiceRecord } from "@/lib/api";
import { getByPath, setByPath } from "@/lib/path";
import type { Extraction, FieldMetadata, FieldStatus } from "@/lib/types";

const FIELD_ACCENT: Record<FieldStatus, string> = {
  ok: "border-l-emerald-400 bg-white",
  warn: "border-l-amber-400 bg-amber-50/60",
  error: "border-l-rose-400 bg-rose-50/70",
};

const DOT: Record<FieldStatus, string> = {
  ok: "bg-emerald-500",
  warn: "bg-amber-500",
  error: "bg-rose-500",
};

export default function ReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const [record, setRecord] = useState<InvoiceRecord | null>(null);
  const [data, setData] = useState<Extraction | null>(null);
  const [baseline, setBaseline] = useState<Extraction | null>(null);
  const [meta, setMeta] = useState<FieldMetadata>({});
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [actionErr, setActionErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [approving, setApproving] = useState(false);

  useEffect(() => {
    getInvoice(id)
      .then((r) => {
        setRecord(r);
        if (r.extraction) {
          setData(structuredClone(r.extraction.reviewedData));
          setBaseline(structuredClone(r.extraction.reviewedData));
          setMeta(r.extraction.fieldMetadata);
        }
      })
      .catch((e) => setLoadErr(e instanceof Error ? e.message : "Failed to load"));
  }, [id]);

  const editable = record?.invoice.status === "needs_review";

  const dirty = useMemo(() => {
    if (!data || !baseline) return [];
    return Object.keys(meta).filter(
      (p) => JSON.stringify(getByPath(data, p)) !== JSON.stringify(getByPath(baseline, p)),
    );
  }, [data, baseline, meta]);

  const counts = useMemo(() => {
    const c = { ok: 0, warn: 0, error: 0 };
    for (const m of Object.values(meta)) c[m.status]++;
    return c;
  }, [meta]);

  const issues = useMemo(() => {
    if (!record) return [];
    return Object.entries(meta)
      .filter(([, m]) => m.validations.length > 0)
      .flatMap(([path, m]) =>
        m.validations.map((rule) => ({
          path,
          message: record.ruleMessages[rule] ?? rule,
        })),
      );
  }, [meta, record]);

  function update(path: string, value: unknown) {
    if (!data) return;
    const next = structuredClone(data);
    setByPath(next, path, value);
    setData(next);
  }

  async function persist(): Promise<boolean> {
    if (!data || dirty.length === 0) return true;
    const res = await patchFields(
      id,
      dirty.map((p) => ({ fieldPath: p, value: getByPath(data, p) })),
    );
    setData(structuredClone(res.reviewedData));
    setBaseline(structuredClone(res.reviewedData));
    setMeta(res.fieldMetadata);
    return true;
  }

  async function onSave() {
    setActionErr(null);
    setSaving(true);
    try {
      await persist();
    } catch (e) {
      setActionErr(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function onApprove() {
    setActionErr(null);
    setApproving(true);
    try {
      await persist();
      await approve(id);
      const r = await getInvoice(id);
      setRecord(r);
      if (r.extraction) setMeta(r.extraction.fieldMetadata);
    } catch (e) {
      const err = e as { status?: number };
      setActionErr(
        err.status === 422
          ? "Resolve the highlighted validation errors before approving."
          : e instanceof Error
            ? e.message
            : "Approve failed",
      );
    } finally {
      setApproving(false);
    }
  }

  if (loadErr) return <Centered>{loadErr}</Centered>;
  if (!record || !data) return <Centered>Loading…</Centered>;
  if (!record.extraction) {
    return (
      <Centered>
        This invoice has no extraction
        {record.invoice.errorMessage ? `: ${record.invoice.errorMessage}` : "."}
      </Centered>
    );
  }

  return (
    <main className="flex flex-1 flex-col">
      <header className="z-10 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="flex items-center justify-between gap-4 px-5 py-2.5">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              href="/dashboard"
              className="flex items-center gap-2 text-slate-400 transition hover:text-slate-700"
              title="Back to invoices"
            >
              <BrandMark className="h-7 w-7" />
            </Link>
            <div className="h-6 w-px bg-slate-200" />
            <span className="truncate text-sm font-semibold text-slate-900">
              {record.invoice.originalFilename}
            </span>
            <StatusBadge status={record.invoice.status} />
            <span className="hidden text-xs text-slate-400 md:inline">
              {record.extraction.modelName}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {actionErr && (
              <span className="hidden max-w-xs truncate text-sm text-rose-600 sm:inline">
                {actionErr}
              </span>
            )}
            {editable ? (
              <>
                <button
                  onClick={onSave}
                  disabled={saving || dirty.length === 0}
                  className="rounded-lg border border-slate-300 px-3.5 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-40"
                >
                  {saving ? "Saving…" : `Save${dirty.length ? ` (${dirty.length})` : ""}`}
                </button>
                <button
                  onClick={onApprove}
                  disabled={approving}
                  className="rounded-lg bg-brand-600 px-4 py-1.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 disabled:opacity-50"
                >
                  {approving ? "Approving…" : "Approve & sign off"}
                </button>
              </>
            ) : (
              <>
                <span className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-700">
                  <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                    <path
                      fillRule="evenodd"
                      d="M16.7 5.3a1 1 0 010 1.4l-7.5 7.5a1 1 0 01-1.4 0L3.3 9.7a1 1 0 011.4-1.4l3.3 3.3 6.8-6.8a1 1 0 011.4 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Signed off
                </span>
                <a
                  href={`/invoices/${id}/export?format=csv`}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  CSV
                </a>
                <a
                  href={`/invoices/${id}/export?format=json`}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  JSON
                </a>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-4 border-t border-slate-100 px-5 py-1.5 text-xs text-slate-500">
          <Legend dot="bg-emerald-500" label={`${counts.ok} verified`} />
          <Legend dot="bg-amber-500" label={`${counts.warn} to check`} />
          <Legend dot="bg-rose-500" label={`${counts.error} errors`} />
        </div>
      </header>

      <div className="grid flex-1 grid-cols-1 overflow-hidden lg:grid-cols-2">
        <div className="hidden bg-slate-100 lg:block">
          {record.invoice.mimeType === "application/pdf" ? (
            <iframe src={`/invoices/${id}/file`} className="h-full min-h-[600px] w-full" />
          ) : (
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/invoices/${id}/file`}
              alt="Original invoice"
              className="mx-auto max-h-full w-full object-contain p-4"
            />
          )}
        </div>

        <div className="overflow-y-auto bg-slate-50 p-5 lg:p-6">
          <div className="mx-auto max-w-xl space-y-5">
            {issues.length > 0 && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
                <p className="text-sm font-semibold text-amber-900">
                  {issues.length} issue{issues.length > 1 ? "s" : ""} to review
                </p>
                <ul className="mt-2 space-y-1.5 text-sm text-amber-800">
                  {issues.map((iss, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                      <span>
                        <span className="font-mono text-xs text-amber-700">{iss.path}</span>
                        {" — "}
                        {iss.message}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <Card title="Invoice">
              <Field label="Invoice number" path="invoiceNumber" {...{ data, meta, editable, update }} />
              <div className="grid grid-cols-2 gap-3">
                <Field label="Issue date" path="issueDate" {...{ data, meta, editable, update }} />
                <Field label="Due date" path="dueDate" {...{ data, meta, editable, update }} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="PO number" path="poNumber" {...{ data, meta, editable, update }} />
                <Field label="Currency" path="currency" {...{ data, meta, editable, update }} />
              </div>
            </Card>

            <Card title="Vendor">
              <Field label="Name" path="vendor.name" {...{ data, meta, editable, update }} />
              <Field label="Address" path="vendor.address" {...{ data, meta, editable, update }} />
              <Field label="Tax ID" path="vendor.taxId" {...{ data, meta, editable, update }} />
            </Card>

            <Card title="Buyer">
              <Field label="Name" path="buyer.name" {...{ data, meta, editable, update }} />
              <Field label="Address" path="buyer.address" {...{ data, meta, editable, update }} />
            </Card>

            <Card title="Line items">
              <div className="overflow-x-auto">
                <table className="w-full border-separate border-spacing-y-1.5 text-sm">
                  <thead className="text-left text-[11px] font-medium uppercase tracking-wide text-slate-400">
                    <tr>
                      <th className="pr-2 font-medium">Description</th>
                      <th className="px-1 font-medium">Qty</th>
                      <th className="px-1 font-medium">Unit price</th>
                      <th className="pl-1 font-medium">Line total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.lineItems.map((_, i) => (
                      <tr key={i}>
                        <td className="pr-2 align-top">
                          <Cell path={`lineItems.${i}.description`} {...{ data, meta, editable, update }} />
                        </td>
                        <td className="w-16 px-1 align-top">
                          <Cell path={`lineItems.${i}.quantity`} number {...{ data, meta, editable, update }} />
                        </td>
                        <td className="w-24 px-1 align-top">
                          <Cell path={`lineItems.${i}.unitPrice`} number {...{ data, meta, editable, update }} />
                        </td>
                        <td className="w-24 pl-1 align-top">
                          <Cell path={`lineItems.${i}.lineTotal`} number {...{ data, meta, editable, update }} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            <Card title="Totals">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Subtotal" path="totals.subtotal" number {...{ data, meta, editable, update }} />
                <Field label="Tax amount" path="totals.taxAmount" number {...{ data, meta, editable, update }} />
                <Field label="Tax rate" path="totals.taxRate" number {...{ data, meta, editable, update }} />
                <Field label="Total" path="totals.total" number {...{ data, meta, editable, update }} />
              </div>
            </Card>
          </div>
        </div>
      </div>
    </main>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex flex-1 items-center justify-center p-6 text-sm text-slate-600">
      {children}
    </main>
  );
}

function Legend({ dot, label }: { dot: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`h-2 w-2 rounded-full ${dot}`} />
      {label}
    </span>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
        {title}
      </h3>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

interface FieldProps {
  label: string;
  path: string;
  number?: boolean;
  data: Extraction;
  meta: FieldMetadata;
  editable: boolean;
  update: (path: string, value: unknown) => void;
}

function toInputValue(v: unknown): string {
  return v === null || v === undefined ? "" : String(v);
}

function accent(meta: FieldMetadata, path: string): string {
  const status = meta[path]?.status;
  return status ? FIELD_ACCENT[status] : "border-l-slate-200 bg-white";
}

function Field({ label, path, number, data, meta, editable, update }: FieldProps) {
  const m = meta[path];
  return (
    <div>
      <div className="mb-1 flex items-center gap-2">
        {m && <span className={`inline-block h-2 w-2 rounded-full ${DOT[m.status]}`} />}
        <label className="text-xs font-medium text-slate-600">{label}</label>
        {m?.corrected && (
          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500 ring-1 ring-inset ring-slate-200">
            corrected
          </span>
        )}
      </div>
      <input
        type={number ? "number" : "text"}
        step={number ? "any" : undefined}
        readOnly={!editable}
        value={toInputValue(getByPath(data, path))}
        onChange={(e) =>
          update(path, number ? (e.target.value === "" ? 0 : Number(e.target.value)) : e.target.value)
        }
        className={`w-full rounded-md border border-l-4 border-slate-200 px-3 py-2 text-sm text-slate-900 transition focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/15 ${accent(meta, path)} ${editable ? "" : "cursor-default text-slate-600"}`}
      />
    </div>
  );
}

function Cell({ path, number, data, meta, editable, update }: Omit<FieldProps, "label">) {
  const m = meta[path];
  return (
    <div className="relative">
      <input
        type={number ? "number" : "text"}
        step={number ? "any" : undefined}
        readOnly={!editable}
        value={toInputValue(getByPath(data, path))}
        onChange={(e) =>
          update(path, number ? (e.target.value === "" ? 0 : Number(e.target.value)) : e.target.value)
        }
        title={m?.corrected ? "corrected" : undefined}
        className={`w-full rounded-md border border-l-4 border-slate-200 px-2 py-1.5 text-sm text-slate-900 transition focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/15 ${accent(meta, path)}`}
      />
    </div>
  );
}
