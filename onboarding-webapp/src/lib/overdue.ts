import { useEffect, useState } from "react";
import { onboardingApi } from "../api";
import { canCall } from "../authz/core";
import { useAuthz } from "../authz/gates";
import { OPERATIONS } from "../authz/operations.gen";

export interface OverdueCounts {
  /** Overdue tasks of the caller's department, or null when the caller has no department view or it is not loaded. */
  mine: number | null;
  /** Overdue tasks across all hires, or null when the caller cannot list every task or it is not loaded. */
  all: number | null;
}

/**
 * The overdue numbers the navigation shows. Each comes from one list call with
 * overdue=true and limit=1: the page's `count` is the total. `refreshKey`
 * reloads them, so completing a task changes the number.
 */
const REFRESH_EVENT = "overdue-counts-refresh";

/** Asks the navigation to reload its overdue numbers, after a change that can move them. */
export function refreshOverdueCounts(): void {
  window.dispatchEvent(new Event(REFRESH_EVENT));
}

export function useOverdueCounts(refreshKey: string): OverdueCounts {
  const { scopes, signedIn } = useAuthz();
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const bump = (): void => setTick((n) => n + 1);
    window.addEventListener(REFRESH_EVENT, bump);
    return () => window.removeEventListener(REFRESH_EVENT, bump);
  }, []);
  const [counts, setCounts] = useState<OverdueCounts>({ mine: null, all: null });
  const canMine = canCall(OPERATIONS["GET /me/department/tasks"], scopes, signedIn);
  const canAll = canCall(OPERATIONS["GET /tasks"], scopes, signedIn);

  useEffect(() => {
    let live = true;
    const query = { overdue: true, limit: 1 };
    if (canMine) {
      void onboardingApi
        .GET("/me/department/tasks", { params: { query: { ...query, status: "todo" } } })
        .then(({ data }) => {
          if (live && data) setCounts((c) => ({ ...c, mine: data.count }));
        })
        .catch(() => undefined);
    }
    if (canAll) {
      void onboardingApi
        .GET("/tasks", { params: { query } })
        .then(({ data }) => {
          if (live && data) setCounts((c) => ({ ...c, all: data.count }));
        })
        .catch(() => undefined);
    }
    return () => {
      live = false;
    };
  }, [canMine, canAll, refreshKey, tick]);

  return counts;
}
