import { createContext, useContext, useEffect, useState, type ReactElement, type ReactNode } from "react";
import { onboardingApi } from "../api";
import type { components } from "../generated/onboarding-api";

export type Me = components["schemas"]["Me"];

type MeState = { me: Me | null; failed: boolean };

const MeContext = createContext<MeState>({ me: null, failed: false });

/** Loads GET /me once when the signed-in shell mounts. */
export function MeProvider({ children }: { children: ReactNode }): ReactElement {
  const [state, setState] = useState<MeState>({ me: null, failed: false });

  useEffect(() => {
    let live = true;
    onboardingApi
      .GET("/me")
      .then(({ data }) => {
        if (live) setState(data ? { me: data, failed: false } : { me: null, failed: true });
      })
      .catch(() => {
        if (live) setState({ me: null, failed: true });
      });
    return () => {
      live = false;
    };
  }, []);

  return <MeContext.Provider value={state}>{children}</MeContext.Provider>;
}

export function useMe(): MeState {
  return useContext(MeContext);
}
