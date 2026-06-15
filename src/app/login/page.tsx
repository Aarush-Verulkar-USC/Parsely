"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { BrandMark } from "@/components/Brand";
import { login, register } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      if (mode === "login") await login(email, password);
      else await register(email, password);
      router.push("/dashboard");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="relative flex flex-1 items-center justify-center overflow-hidden p-6">
      <div className="pointer-events-none absolute inset-0 bg-linear-to-br from-slate-50 via-white to-brand-50" />
      <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-brand-100/50 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -right-24 h-96 w-96 rounded-full bg-indigo-100/40 blur-3xl" />

      <div className="relative w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <BrandMark className="h-12 w-12" />
          <h1 className="mt-4 text-2xl font-semibold tracking-tight text-slate-900">
            Parsely
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Invoice extraction with human sign-off
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white/80 p-7 shadow-xl shadow-slate-200/50 backdrop-blur">
          <h2 className="text-sm font-medium text-slate-900">
            {mode === "login" ? "Welcome back" : "Create your account"}
          </h2>

          <form onSubmit={submit} className="mt-5 space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-600">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm transition focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600">Password</label>
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm transition focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
            </div>

            {err && (
              <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">{err}</p>
            )}

            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 disabled:opacity-50"
            >
              {busy ? "…" : mode === "login" ? "Sign in" : "Create account"}
            </button>
          </form>

          <button
            onClick={() => {
              setMode(mode === "login" ? "register" : "login");
              setErr(null);
            }}
            className="mt-5 w-full text-center text-sm text-slate-500 transition hover:text-slate-900"
          >
            {mode === "login" ? (
              <>Need an account? <span className="font-medium text-brand-600">Register</span></>
            ) : (
              <>Have an account? <span className="font-medium text-brand-600">Sign in</span></>
            )}
          </button>
        </div>
      </div>
    </main>
  );
}
