"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";
import { postEnergy, EnergyClientError } from "./energyClient";
import type { EnergyRequest, EnergyResult } from "@/lib/energy/types";

interface CacheEntry {
  data: EnergyResult | null;
  error: EnergyClientError | null;
  snapshotTimestamp: string | null;
  requestSeq: number;
  controller: AbortController | null;
}

const EMPTY_ENTRY: CacheEntry = {
  data: null,
  error: null,
  snapshotTimestamp: null,
  requestSeq: 0,
  controller: null,
};

// Session-scoped external store: lives for the life of the JS module (i.e.
// the browser tab), never persisted to localStorage, cleared on reload.
// Keyed by operation+account+month so distinct selections never collide.
// Modeled as a plain external store (rather than component state) so the
// data-fetching side effect only ever touches this store, never a React
// setState directly — components subscribe to it via useSyncExternalStore.
const cache = new Map<string, CacheEntry>();
const listeners = new Set<() => void>();

function notify() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getEntry(key: string): CacheEntry {
  return cache.get(key) ?? EMPTY_ENTRY;
}

function keyFor(request: EnergyRequest): string {
  const accountId = "account_id" in request ? request.account_id : "";
  const month = "month" in request ? request.month : "";
  return `${request.operation}:${accountId}:${month}`;
}

function runFetch(cacheKey: string, req: EnergyRequest) {
  const previous = cache.get(cacheKey);
  previous?.controller?.abort();

  const seq = (previous?.requestSeq ?? 0) + 1;
  const controller = new AbortController();
  cache.set(cacheKey, {
    data: previous?.data ?? null,
    error: null,
    snapshotTimestamp: previous?.snapshotTimestamp ?? null,
    requestSeq: seq,
    controller,
  });
  notify();

  postEnergy(req, controller.signal)
    .then((result) => {
      const current = cache.get(cacheKey);
      if (!current || current.requestSeq !== seq) return; // superseded by a newer request
      cache.set(cacheKey, {
        data: result,
        error: null,
        snapshotTimestamp: result.metadata.created_at_utc,
        requestSeq: seq,
        controller: null,
      });
      notify();
    })
    .catch((err: unknown) => {
      if (err instanceof DOMException && err.name === "AbortError") return;
      const current = cache.get(cacheKey);
      if (!current || current.requestSeq !== seq) return;
      cache.set(cacheKey, {
        data: current.data,
        error:
          err instanceof EnergyClientError
            ? err
            : new EnergyClientError("UPSTREAM_INVALID_RESPONSE", "Something went wrong."),
        snapshotTimestamp: current.snapshotTimestamp,
        requestSeq: seq,
        controller: null,
      });
      notify();
    });
}

// Lets a component force-refresh a query it does not itself hold a hook
// instance for (e.g. the page-level Refresh button reconciling the
// investigation panel's cache entry alongside the account overview's).
export function refetchEnergyQuery(request: EnergyRequest) {
  runFetch(keyFor(request), request);
}

export interface UseEnergyQueryResult<T extends EnergyResult> {
  data: T | null;
  error: EnergyClientError | null;
  isLoading: boolean;
  snapshotTimestamp: string | null;
  refetch: () => void;
}

// Fetches list_accounts / account_details / investigate_usage with
// race-safe caching. Pass `null` to skip fetching (e.g. before an account
// is selected). explain_usage deliberately does NOT use this hook — it is
// only triggered on demand from the investigation panel and must not be
// cached alongside investigate_usage results.
export function useEnergyQuery<T extends EnergyResult>(
  request: EnergyRequest | null
): UseEnergyQueryResult<T> {
  const key = request ? keyFor(request) : null;

  const getSnapshot = useCallback(() => getEntry(key ?? ""), [key]);
  const entry = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  useEffect(() => {
    if (!key || !request) return;
    if (!cache.has(key)) {
      runFetch(key, request);
    }
  }, [key, request]);

  const refetch = useCallback(() => {
    if (key && request) {
      runFetch(key, request);
    }
  }, [key, request]);

  if (!key) {
    return { data: null, error: null, isLoading: false, snapshotTimestamp: null, refetch: () => {} };
  }

  return {
    data: (entry.data as T | null) ?? null,
    error: entry.error,
    isLoading: Boolean(entry.controller),
    snapshotTimestamp: entry.snapshotTimestamp,
    refetch,
  };
}
