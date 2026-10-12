import { useCallback, useEffect, useState } from "react";

/** A non-2xx answer from onboarding-api, carrying the contract's Error text. */
export class ApiProblem extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function problemText(error: unknown, fallback: string): string {
  if (error && typeof error === "object") {
    const e = error as { description?: unknown; message?: unknown };
    if (typeof e.description === "string" && e.description) return e.description;
    if (typeof e.message === "string" && e.message) return e.message;
  }
  return fallback;
}

/** Returns the data of an openapi-fetch result, or throws an ApiProblem. */
export function unwrap<T>(result: { data?: T; error?: unknown; response: Response }): T {
  if (result.error !== undefined || !result.response.ok) {
    throw new ApiProblem(result.response.status, problemText(result.error, `The request failed (${result.response.status}).`));
  }
  return result.data as T;
}

/** For operations that answer 204: throws on failure, returns nothing. */
export function ensureOk(result: { error?: unknown; response: Response }): void {
  unwrap(result);
}

/** Reads every page of a list operation (limit 100 is the contract's maximum). */
export async function fetchAll<T>(
  page: (offset: number) => Promise<{ count: number; data: T[] }>,
): Promise<T[]> {
  const all: T[] = [];
  for (;;) {
    const res = await page(all.length);
    all.push(...res.data);
    if (res.data.length === 0 || all.length >= res.count) return all;
  }
}

export type Loaded<T> =
  | { state: "loading" }
  | { state: "failed"; status: number | null; message: string }
  | { state: "ready"; data: T };

/** Runs `fn` on mount and whenever `deps` change; `reload` runs it again. */
export function useLoad<T>(fn: () => Promise<T>, deps: readonly unknown[]): [Loaded<T>, () => void] {
  const [result, setResult] = useState<Loaded<T>>({ state: "loading" });
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let live = true;
    fn().then(
      (data) => {
        if (live) setResult({ state: "ready", data });
      },
      (err: unknown) => {
        if (!live) return;
        const status = err instanceof ApiProblem ? err.status : null;
        const message = err instanceof Error ? err.message : "The request failed.";
        setResult({ state: "failed", status, message });
      },
    );
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);

  const reload = useCallback(() => setTick((n) => n + 1), []);
  return [result, reload];
}

export function messageOf(err: unknown): string {
  return err instanceof Error ? err.message : "The request failed.";
}

export function offsetText(offset: number): string {
  if (offset < 0) return `${-offset} days before start`;
  if (offset === 0) return "On the start date";
  return `${offset} days after start`;
}
