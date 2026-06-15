"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Brand } from "@/components/Brand";
import { StatusBadge } from "@/components/StatusBadge";
import {
  listInvoices,
  logout,
  me,
  uploadInvoice,
  type InvoiceListItem,
} from "@/lib/api";

const ACTIVE = new Set(["uploaded", "processing"]);

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.round(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return new Date(iso).toLocaleDateString();
}

function FileIcon({ name }: { name: string }) {
  const isImage = /\.(png|jpe?g|webp)$/i.test(name);
  return (
    <span
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[10px] font-bold ${
        isImage ? "bg-violet-50 text-violet-600" : "bg-rose-50 text-rose-600"
      }`}
    >
      {isImage ? "IMG" : "PDF"}
    </span>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [invoices, setInvoices] = useState<InvoiceListItem[]>([]);
  const [uploadErr, setUploadErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const refresh = useCallback(async () => {
    setInvoices(await listInvoices());
  }, []);

  useEffect(() => {
    me()
      .then(({ user }) => {
        setEmail(user.email);
        return refresh();
      })
      .catch(() => router.replace("/login"));
  }, [router, refresh]);

  useEffect(() => {
    if (!invoices.some((i) => ACTIVE.has(i.status))) return;
    const t = setInterval(refresh, 1500);
    return () => clearInterval(t);
  }, [invoices, refresh]);

  const doUpload = useCallback(
    async (file: File) => {
      setUploadErr(null);
      setBusy(true);
      try {
        await uploadInvoice(file);
        await refresh();
      } catch (e) {
        setUploadErr(e instanceof Error ? e.message : "Upload failed");
      } finally {
        setBusy(false);
        if (fileRef.current) fileRef.current.value = "";
      }
    },
    [refresh],
  );

  const pending = invoices.filter((i) => i.status === "needs_review").length;

  return (
    <main className="flex-1">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
          <Brand />
          <div className="flex items-center gap-3 text-sm">
            {email && <span className="hidden text-slate-500 sm:inline">{email}</span>}
            <button
              onClick={async () => {
                await logout();
                router.replace("/login");
              }}
              className="rounded-lg border border-slate-300 px-3 py-1.5 font-medium text-slate-600 transition hover:bg-slate-50"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-6 py-8">
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-slate-900">Invoices</h1>
            <p className="mt-0.5 text-sm text-slate-500">
              {invoices.length === 0
                ? "Upload an invoice to begin."
                : `${invoices.length} total${pending ? ` · ${pending} awaiting review` : ""}`}
            </p>
          </div>
        </div>

        {/* Upload dropzone */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            const f = e.dataTransfer.files?.[0];
            if (f) doUpload(f);
          }}
          onClick={() => fileRef.current?.click()}
          className={`mt-5 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-8 text-center transition ${
            dragging
              ? "border-brand-500 bg-brand-50"
              : "border-slate-300 bg-white hover:border-brand-400 hover:bg-slate-50"
          }`}
        >
          <svg viewBox="0 0 24 24" fill="none" className="h-8 w-8 text-slate-400">
            <path
              d="M12 16V4m0 0L8 8m4-4l4 4M4 17v1a3 3 0 003 3h10a3 3 0 003-3v-1"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <p className="mt-2 text-sm font-medium text-slate-700">
            {busy ? "Uploading…" : "Drop an invoice here, or click to browse"}
          </p>
          <p className="mt-0.5 text-xs text-slate-400">PDF, PNG, JPEG, or WebP · up to 20 MB</p>
          <input
            ref={fileRef}
            type="file"
            accept="application/pdf,image/png,image/jpeg,image/webp"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) doUpload(f);
            }}
            disabled={busy}
            className="hidden"
          />
        </div>
        {uploadErr && <p className="mt-2 text-sm text-rose-600">{uploadErr}</p>}

        {/* List */}
        <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          {invoices.length === 0 ? (
            <p className="p-12 text-center text-sm text-slate-400">No invoices yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200 bg-slate-50/80 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3">File</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Pages</th>
                  <th className="px-5 py-3">Uploaded</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invoices.map((inv) => {
                  const reviewable = ["needs_review", "approved", "exported"].includes(inv.status);
                  return (
                    <tr key={inv.id} className="group transition hover:bg-slate-50">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <FileIcon name={inv.originalFilename} />
                          <span className="font-medium text-slate-800">
                            {inv.originalFilename}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <StatusBadge status={inv.status} />
                      </td>
                      <td className="px-5 py-3 text-slate-500">{inv.pageCount ?? "—"}</td>
                      <td className="px-5 py-3 text-slate-500">{relativeTime(inv.createdAt)}</td>
                      <td className="px-5 py-3 text-right">
                        {reviewable ? (
                          <Link
                            href={`/review/${inv.id}`}
                            className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium text-brand-600 transition hover:bg-brand-50"
                          >
                            {inv.status === "needs_review" ? "Review" : "View"}
                            <span className="transition group-hover:translate-x-0.5">→</span>
                          </Link>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </main>
  );
}
