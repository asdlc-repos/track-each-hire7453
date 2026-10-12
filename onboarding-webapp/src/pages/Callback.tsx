import { useEffect, type ReactElement } from "react";
import { useNavigate } from "react-router-dom";
import { handleCallback } from "../authz/session";
import { Splash } from "../shell/Splash";

// StrictMode runs effects twice; the callback may be processed only once.
let pending: Promise<void> | null = null;

export function CallbackPage(): ReactElement {
  const navigate = useNavigate();
  useEffect(() => {
    pending ??= handleCallback();
    void pending.then(
      () => navigate("/", { replace: true }),
      () => navigate("/", { replace: true }),
    );
  }, [navigate]);
  return <Splash />;
}
