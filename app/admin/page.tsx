"use client";

import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { Loader2, LogOut } from "lucide-react";
import { supabase, supabaseConfigured } from "@/lib/supabaseClient";
import { verifyAdmin } from "@/lib/adminApi";
import LibraryManager from "@/components/admin/LibraryManager";
import BundleHeroes from "@/components/admin/BundleHeroes";

const TABS = [
  { id: "library", label: "Models & Drive links" },
  { id: "heroes", label: "Bundle hero image" },
] as const;
type Tab = (typeof TABS)[number]["id"];

const field =
  "rounded-lg border border-base-700 bg-base-950 px-3 py-2 text-base-200 outline-none focus:border-accent";

function SignIn({ notice }: { notice: string | null }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (error) setError(error.message);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-base-950 px-6">
      <form onSubmit={submit} className="flex w-full max-w-sm flex-col gap-4 rounded-xl2 border border-base-700 bg-base-900 p-8">
        <h1 className="text-lg font-semibold text-base-200">Admin sign in</h1>
        {(error || notice) && <p className="text-sm text-red-400">{error || notice}</p>}
        <input
          type="email"
          autoComplete="username"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          required
          className={field}
        />
        <input
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          required
          className={field}
        />
        <button
          type="submit"
          disabled={busy}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-fg disabled:opacity-60"
        >
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </main>
  );
}

export default function AdminPage() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [allowed, setAllowed] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("library");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => data.subscription.unsubscribe();
  }, []);

  // A Supabase login alone isn't enough: the server checks the email against ADMIN_EMAILS.
  const userId = session?.user.id;
  useEffect(() => {
    if (!userId) {
      setAllowed(false);
      return;
    }
    verifyAdmin()
      .then(() => {
        setNotice(null);
        setAllowed(true);
      })
      .catch((err) => {
        setNotice(err instanceof Error ? err.message : "Not allowed");
        supabase.auth.signOut();
      });
  }, [userId]);

  if (!supabaseConfigured) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-base-950 px-6 text-sm text-accent">
        Supabase environment variables aren&apos;t set yet — add them in Vercel (see README), then redeploy.
      </main>
    );
  }
  if (session === undefined || (session && !allowed)) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-base-950">
        <Loader2 className="h-6 w-6 animate-spin text-base-400" />
      </main>
    );
  }
  if (!session) return <SignIn notice={notice} />;

  return (
    <main className="min-h-screen bg-base-950 px-6 py-12 sm:px-10">
      <div className="mx-auto flex max-w-5xl flex-col gap-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <span className="text-sm font-semibold uppercase tracking-wide text-accent">Admin</span>
            <h1 className="mt-1 text-2xl font-semibold text-base-200">Manage VizAssets</h1>
            <p className="mt-2 max-w-xl text-sm text-base-400">Changes go live without a redeploy.</p>
          </div>
          <button
            onClick={() => supabase.auth.signOut()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-base-700 px-3 py-1.5 text-sm text-base-400 hover:border-base-600 hover:text-base-200"
          >
            <LogOut className="h-4 w-4" /> Sign out ({session.user.email})
          </button>
        </div>

        <div className="flex gap-2 border-b border-base-700" role="tablist">
          {TABS.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium ${tab === t.id ? "border-accent text-accent" : "border-transparent text-base-400 hover:text-base-200"}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === "library" ? <LibraryManager /> : <BundleHeroes />}
      </div>
    </main>
  );
}
