"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Copy, Loader2, Plus, Search, Trash2 } from "lucide-react";
import { bundles } from "@/lib/bundles";
import {
  ORDER_STATUSES,
  Order,
  OrderFields,
  OrderStatus,
  createOrder,
  deleteOrder,
  listOrders,
  updateOrder,
} from "@/lib/adminApi";

const field =
  "w-full rounded-lg border border-base-700 bg-base-950 px-3 py-2 text-sm text-base-200 outline-none placeholder:text-base-500 focus:border-accent";

const STATUS_TONE: Record<OrderStatus, string> = {
  pending: "border-base-600 text-base-300",
  paid: "border-amber-400/60 bg-amber-400/10 text-amber-300",
  access_granted: "border-accent/60 bg-accent/10 text-accent",
  cancelled: "border-base-700 text-base-500 line-through",
};

// The one-click next step for each status.
const NEXT_STEP: Partial<Record<OrderStatus, { to: OrderStatus; label: string }>> = {
  pending: { to: "paid", label: "Mark as paid" },
  paid: { to: "access_granted", label: "Drive access granted" },
};

const statusLabel = (s: OrderStatus) => ORDER_STATUSES.find((x) => x.id === s)?.label ?? s;
const bundleName = (slug: string) => bundles.find((b) => b.slug === slug)?.name ?? slug;
const peso = (n: number) => `₱${Number(n).toLocaleString("en-PH")}`;

function errorText(err: unknown) {
  return err instanceof Error ? err.message : "Something went wrong";
}

function emptyFields(): OrderFields {
  return {
    customerName: "",
    googleEmail: "",
    bundleSlug: bundles[0].slug,
    amount: String(bundles[0].price),
    status: "pending",
    gcashReference: "",
    notes: "",
  };
}

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {}
      }}
      title={label}
      aria-label={label}
      className="rounded-md p-1 text-base-400 hover:bg-base-800 hover:text-accent"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-accent" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}

function NewOrder({ onCreated }: { onCreated: (o: Order) => void }) {
  const [open, setOpen] = useState(false);
  const [fields, setFields] = useState(emptyFields);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (key: keyof OrderFields) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setFields((f) => {
      const next = { ...f, [key]: e.target.value };
      // Picking another bundle fills in its price.
      if (key === "bundleSlug") next.amount = String(bundles.find((b) => b.slug === e.target.value)?.price ?? f.amount);
      return next;
    });

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 self-start rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-fg"
      >
        <Plus className="h-4 w-4" /> New order
      </button>
    );
  }

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setSaving(true);
        setError(null);
        try {
          onCreated(await createOrder(fields));
          setFields(emptyFields());
          setOpen(false);
        } catch (err) {
          setError(errorText(err));
        } finally {
          setSaving(false);
        }
      }}
      className="flex flex-col gap-3 rounded-xl2 border border-base-700 bg-base-900 p-6"
    >
      <h2 className="text-lg font-semibold text-base-200">New order</h2>
      <p className="-mt-2 text-sm text-base-400">
        Log it when a buyer messages you, so you know whose Drive access is still to do.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <input value={fields.customerName} onChange={set("customerName")} placeholder="Buyer name (as on Messenger)" required className={field} />
        <input
          value={fields.googleEmail}
          onChange={set("googleEmail")}
          placeholder="Google email for Drive access"
          type="email"
          required
          className={field}
        />
        <select value={fields.bundleSlug} onChange={set("bundleSlug")} className={field} aria-label="Bundle">
          {bundles.map((b) => (
            <option key={b.slug} value={b.slug}>
              {b.name}
            </option>
          ))}
        </select>
        <input value={fields.amount} onChange={set("amount")} inputMode="decimal" placeholder="Amount (₱)" aria-label="Amount in pesos" className={field} />
        <select value={fields.status} onChange={set("status")} className={field} aria-label="Status">
          {ORDER_STATUSES.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
        <input value={fields.gcashReference} onChange={set("gcashReference")} placeholder="GCash reference no. (optional)" className={field} />
        <textarea value={fields.notes} onChange={set("notes")} placeholder="Notes (optional)" rows={2} className={`${field} sm:col-span-2`} />
      </div>
      {error && <p className="text-sm text-red-400">{error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-fg disabled:opacity-50"
        >
          {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Save order
        </button>
        <button type="button" onClick={() => setOpen(false)} className="rounded-lg px-3 py-2 text-sm text-base-400 hover:text-base-200">
          Cancel
        </button>
      </div>
    </form>
  );
}

function OrderRow({ order, onChange, onDeleted }: { order: Order; onChange: (o: Order) => void; onDeleted: () => void }) {
  const [notes, setNotes] = useState(order.notes ?? "");
  const [reference, setReference] = useState(order.gcash_reference ?? "");
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setNotes(order.notes ?? "");
    setReference(order.gcash_reference ?? "");
  }, [order]);

  async function save(fields: Partial<OrderFields>) {
    setBusy(true);
    setError(null);
    try {
      onChange(await updateOrder(order.id, fields));
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  const next = NEXT_STEP[order.status];
  const detailsDirty = notes.trim() !== (order.notes ?? "") || reference.trim() !== (order.gcash_reference ?? "");

  return (
    <div className="flex flex-col gap-3 border-b border-base-700 py-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold text-base-200">{order.customer_name}</p>
          <p className="flex items-center gap-1 text-sm text-base-300">
            <span className="truncate">{order.google_email}</span>
            <CopyButton value={order.google_email} label="Copy email" />
          </p>
          <p className="text-xs text-base-400">
            {new Date(order.created_at).toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" })} ·{" "}
            {bundleName(order.bundle_slug)} · {peso(order.amount)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={order.status}
            disabled={busy}
            onChange={(e) => save({ status: e.target.value as OrderStatus })}
            aria-label="Order status"
            className={`rounded-full border bg-transparent px-3 py-1 text-xs font-semibold outline-none ${STATUS_TONE[order.status]}`}
          >
            {ORDER_STATUSES.map((s) => (
              <option key={s.id} value={s.id} className="bg-base-900 text-base-200 no-underline">
                {s.label}
              </option>
            ))}
          </select>
          {next && (
            <button
              onClick={() => save({ status: next.to })}
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-accent-fg disabled:opacity-50"
            >
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />} {next.label}
            </button>
          )}
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-[1fr_2fr_auto]">
        <input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="GCash reference no." className={field} />
        <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes" className={field} />
        <div className="flex gap-2">
          <button
            onClick={() => save({ notes, gcashReference: reference })}
            disabled={!detailsDirty || busy}
            className="rounded-lg border border-base-600 px-3 py-2 text-sm text-base-200 hover:border-accent hover:text-accent disabled:opacity-40"
          >
            Save
          </button>
          <button
            onClick={async () => {
              if (!confirmDelete) return setConfirmDelete(true);
              setBusy(true);
              try {
                await deleteOrder(order.id);
                onDeleted();
              } catch (err) {
                setError(errorText(err));
                setBusy(false);
              }
            }}
            onBlur={() => setConfirmDelete(false)}
            disabled={busy}
            className={`inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm ${confirmDelete ? "bg-red-500/15 text-red-400" : "text-base-400 hover:text-red-400"}`}
          >
            <Trash2 className="h-3.5 w-3.5" /> {confirmDelete ? "Confirm" : "Delete"}
          </button>
        </div>
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}

export default function OrdersManager() {
  const [filter, setFilter] = useState<OrderStatus | "all">("all");
  const [q, setQ] = useState("");
  const [orders, setOrders] = useState<Order[]>([]);
  const [counts, setCounts] = useState<Record<OrderStatus, number> | null>(null);
  const [limit, setLimit] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestRef = useRef(0);

  const load = useCallback(async () => {
    const request = ++requestRef.current;
    setLoading(true);
    setError(null);
    try {
      const res = await listOrders({ status: filter === "all" ? undefined : filter, q });
      if (request !== requestRef.current) return;
      setOrders(res.orders);
      setCounts(res.counts);
      setLimit(res.limit);
    } catch (err) {
      if (request === requestRef.current) setError(errorText(err));
    } finally {
      if (request === requestRef.current) setLoading(false);
    }
  }, [filter, q]);

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);

  const total = counts ? Object.values(counts).reduce((a, b) => a + b, 0) : 0;
  const bump = (status: OrderStatus, delta: number) =>
    setCounts((c) => (c ? { ...c, [status]: Math.max(0, (c[status] ?? 0) + delta) } : c));
  const visible = (o: Order) => filter === "all" || o.status === filter;

  return (
    <div className="flex flex-col gap-6">
      <NewOrder
        onCreated={(o) => {
          bump(o.status, 1);
          if (visible(o)) setOrders((prev) => [o, ...prev]);
        }}
      />

      <section className="flex flex-col gap-4 rounded-xl2 border border-base-700 bg-base-900 p-6">
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filter orders by status">
          {([["all", "All", total]] as [OrderStatus | "all", string, number][])
            .concat(ORDER_STATUSES.map((s) => [s.id, s.label, counts?.[s.id] ?? 0]))
            .map(([id, label, count]) => (
              <button
                key={id}
                role="tab"
                aria-selected={filter === id}
                onClick={() => setFilter(id)}
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium ${
                  filter === id ? "border-accent bg-accent/15 text-accent" : "border-base-700 text-base-400 hover:border-base-600"
                }`}
              >
                {label}
                <span
                  className={`rounded-full px-1.5 text-[11px] font-semibold ${
                    id === "paid" && count > 0 ? "bg-amber-400 text-base-950" : "bg-base-700 text-base-300"
                  }`}
                >
                  {count}
                </span>
              </button>
            ))}
        </div>

        {counts && counts.paid > 0 && filter !== "paid" && (
          <p className="rounded-lg border border-amber-400/40 bg-amber-400/10 px-4 py-2.5 text-sm text-amber-300">
            {counts.paid} paid {counts.paid === 1 ? "order is" : "orders are"} waiting for Drive access.{" "}
            <button onClick={() => setFilter("paid")} className="font-semibold underline">
              Show them
            </button>
          </p>
        )}

        <label className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-base-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name, email or GCash reference…"
            aria-label="Search orders"
            className={`${field} pl-9`}
          />
        </label>

        {error && <p className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</p>}

        <div className="flex flex-col">
          {orders.map((o) => (
            <OrderRow
              key={o.id}
              order={o}
              onChange={(updated) => {
                if (updated.status !== o.status) {
                  bump(o.status, -1);
                  bump(updated.status, 1);
                }
                setOrders((prev) =>
                  visible(updated) ? prev.map((x) => (x.id === updated.id ? updated : x)) : prev.filter((x) => x.id !== updated.id)
                );
              }}
              onDeleted={() => {
                bump(o.status, -1);
                setOrders((prev) => prev.filter((x) => x.id !== o.id));
              }}
            />
          ))}
        </div>

        {loading && <Loader2 className="mx-auto h-5 w-5 animate-spin text-base-400" />}
        {!loading && orders.length === 0 && !error && (
          <p className="py-6 text-center text-sm text-base-400">
            {q || filter !== "all" ? "No orders match." : "No orders yet. Add one with “New order” when a buyer messages you."}
          </p>
        )}
        {!loading && orders.length >= limit && limit > 0 && (
          <p className="text-center text-xs text-base-500">Showing the newest {limit}. Search to find older ones.</p>
        )}
      </section>
    </div>
  );
}
