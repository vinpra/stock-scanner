"use client";

import { useState } from "react";

type AuthMode = "login" | "register";

const inputClasses =
  "w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400";

export default function LoginClient() {
  const [mode, setMode] = useState<AuthMode>("login");
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Authentication failed.");
        return;
      }

      window.location.assign("/");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-8">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-5xl items-center">
        <div className="grid w-full gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="rounded-[2rem] border border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(148,163,184,0.24),_transparent_44%),linear-gradient(145deg,#0f172a,#1e293b)] p-8 text-white shadow-xl">
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-300">
              Stock Scanner
            </p>
            <h1 className="mt-4 max-w-md text-4xl font-semibold leading-tight">
              Simple portfolio login for a shared hobby dashboard.
            </h1>
            <p className="mt-4 max-w-lg text-sm leading-7 text-slate-300">
              Each username has its own Redis-backed holdings. Register once, then
              log in and the portfolio panel will load your saved positions.
            </p>
            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-400">
                  Users
                </p>
                <p className="mt-2 text-2xl font-semibold">Multi-user</p>
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-400">
                  Session
                </p>
                <p className="mt-2 text-2xl font-semibold">Cookie-based</p>
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-400">
                  Portfolio
                </p>
                <p className="mt-2 text-2xl font-semibold">Redis saved</p>
              </div>
            </div>
          </section>

          <section className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
            <div className="flex items-center gap-2 rounded-full bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => setMode("login")}
                className={`flex-1 rounded-full px-4 py-2 text-sm font-semibold transition ${
                  mode === "login"
                    ? "bg-slate-900 text-white"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Login
              </button>
              <button
                type="button"
                onClick={() => setMode("register")}
                className={`flex-1 rounded-full px-4 py-2 text-sm font-semibold transition ${
                  mode === "register"
                    ? "bg-slate-900 text-white"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Register
              </button>
            </div>

            <div className="mt-8">
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
                {mode === "login" ? "Welcome back" : "Create account"}
              </p>
              <h2 className="mt-2 text-3xl font-semibold text-slate-900">
                {mode === "login" ? "Sign in to your dashboard" : "Start a new portfolio"}
              </h2>
            </div>

            <div className="mt-8 space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Username
                </label>
                <input
                  type="text"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value.toLowerCase())}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      void submit();
                    }
                  }}
                  placeholder="trader01"
                  className={inputClasses}
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Password / PIN
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      void submit();
                    }
                  }}
                  placeholder="Minimum 4 characters"
                  className={inputClasses}
                />
              </div>
            </div>

            {error ? (
              <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {error}
              </div>
            ) : null}

            <button
              type="button"
              onClick={() => void submit()}
              disabled={loading}
              className="mt-6 w-full rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {loading ? "Working..." : mode === "login" ? "Login" : "Create account"}
            </button>

            <p className="mt-4 text-xs leading-6 text-slate-500">
              This is lightweight hobby-app auth. Each account gets its own
              cookie session and Redis-backed portfolio.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
