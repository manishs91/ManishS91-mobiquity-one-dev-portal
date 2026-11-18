"use client";
import { useState } from "react";

export interface FieldError {
  field: string;
  message: string;
}

/** Small helper for JSON calls to the portal's own API routes. */
export function useApi<T = unknown>() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  async function call(url: string, init: { method?: string; body?: unknown } = {}): Promise<T | null> {
    setBusy(true);
    setError(null);
    setFieldErrors({});
    try {
      const res = await fetch(url, {
        method: init.method ?? (init.body === undefined ? "GET" : "POST"),
        headers: init.body === undefined ? undefined : { "Content-Type": "application/json" },
        body: init.body === undefined ? undefined : JSON.stringify(init.body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const details = Array.isArray(data.details) ? (data.details as FieldError[]) : [];
        setFieldErrors(Object.fromEntries(details.map((d) => [d.field, d.message])));
        setError(details.length ? "Check the highlighted fields." : (data.error ?? `Request failed (${res.status}).`));
        return null;
      }
      return data as T;
    } catch {
      setError("Couldn't reach the portal. Check your connection and try again.");
      return null;
    } finally {
      setBusy(false);
    }
  }

  return { call, busy, error, fieldErrors, setError };
}
