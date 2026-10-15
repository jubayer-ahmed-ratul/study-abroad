"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

function useBusy() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return { busy, setBusy, error, setError };
}

async function apiJson(url: string, init: RequestInit): Promise<{ ok: boolean; message?: string }> {
  const response = await fetch(url, init);
  let body: { status?: string; message?: string } = {};
  try {
    body = (await response.json()) as typeof body;
  } catch {
    // Non-JSON failure — fall through to generic message.
  }
  if (!response.ok) {
    return { ok: false, message: body.message ?? `Request failed (${response.status}).` };
  }
  return { ok: true };
}

export function PublishToggle({ id, isPublished }: { id: string; isPublished: boolean }) {
  const router = useRouter();
  const { busy, setBusy, error, setError } = useBusy();

  async function toggle() {
    if (busy) return;
    setBusy(true);
    setError(null);
    const result = await apiJson(`/api/admin/countries/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isPublished: !isPublished }),
    });
    if (!result.ok) {
      setError(result.message ?? "Could not update status.");
      setBusy(false);
      return;
    }
    router.refresh();
  }

  return (
    <span className="inline-flex flex-col gap-1">
      <button
        type="button"
        onClick={toggle}
        disabled={busy}
        aria-pressed={isPublished}
        className="rounded-lg border border-zinc-300 px-2.5 py-1 text-xs font-medium hover:bg-zinc-100 disabled:opacity-60 dark:border-zinc-700 dark:hover:bg-zinc-900"
      >
        {busy ? "Saving…" : isPublished ? "Unpublish" : "Publish"}
      </button>
      {error && (
        <span role="alert" className="text-xs text-red-600">
          {error}
        </span>
      )}
    </span>
  );
}

export function DeleteCountry({ id, name }: { id: string; name: string }) {
  const router = useRouter();
  const { busy, setBusy, error, setError } = useBusy();
  const [confirming, setConfirming] = useState(false);

  async function remove() {
    if (busy) return;
    setBusy(true);
    setError(null);
    const result = await apiJson(`/api/admin/countries/${id}`, { method: "DELETE" });
    if (!result.ok) {
      setError(result.message ?? "Could not delete.");
      setBusy(false);
      setConfirming(false);
      return;
    }
    router.refresh();
  }

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="rounded-lg border border-red-300 px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950"
      >
        Delete
      </button>
    );
  }

  return (
    <span className="inline-flex flex-col gap-1">
      <span className="text-xs text-zinc-600 dark:text-zinc-400">
        Delete “{name}”? This cannot be undone.
      </span>
      <span className="inline-flex gap-1">
        <button
          type="button"
          onClick={remove}
          disabled={busy}
          className="rounded-lg bg-red-700 px-2.5 py-1 text-xs font-medium text-white disabled:opacity-60"
        >
          {busy ? "Deleting…" : "Confirm"}
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          disabled={busy}
          className="rounded-lg border border-zinc-300 px-2.5 py-1 text-xs font-medium disabled:opacity-60"
        >
          Cancel
        </button>
      </span>
      {error && (
        <span role="alert" className="text-xs text-red-600">
          {error}
        </span>
      )}
    </span>
  );
}
