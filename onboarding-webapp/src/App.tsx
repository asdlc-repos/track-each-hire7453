import { useEffect, type ReactElement } from "react";
import { Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { AuthzProvider, Forbidden, NoAccess, RequireOperation, useAuthz, useScopes } from "./authz/gates";
import { SCREEN_ROUTES, reachableScreens, hasScopedReach } from "./authz/screens";
import { setForbiddenNavigator } from "./authz/client";
import { signIn } from "./authz/session";
import { APP_NAME } from "./appName";
import { Splash } from "./shell/Splash";
import { AppLayout } from "./shell/AppLayout";
import { MeProvider } from "./shell/Me";
import { GateLayout } from "./shell/GateLayout";
import { CallbackPage } from "./pages/Callback";
import { AccountPage } from "./pages/Account";
import { SignedOutPage } from "./pages/SignedOut";
import { PlaceholderPage } from "./pages/Placeholder";

/** Pages by screen key. Later items replace the placeholders one by one. */
const PAGE_BY_KEY: Record<string, ReactElement> = {
  dashboard: <PlaceholderPage screenKey="dashboard" />,
  plans: <PlaceholderPage screenKey="plans" />,
  overdue: <PlaceholderPage screenKey="overdue" />,
  template: <PlaceholderPage screenKey="template" />,
  "my-tasks": <PlaceholderPage screenKey="my-tasks" />,
  "plan-new": <PlaceholderPage screenKey="plan-new" />,
  "plan-detail": <PlaceholderPage screenKey="plan-detail" />,
  "task-detail": <PlaceholderPage screenKey="task-detail" />,
  account: <AccountPage />,
  "signed-out": <SignedOutPage />,
};

const PUBLIC_SCREENS = SCREEN_ROUTES.filter((screen) => screen.public);

export default function App(): ReactElement {
  return (
    <>
      <ForbiddenWiring />
      <Routes>
        <Route path="/callback" element={<CallbackPage />} />
        {PUBLIC_SCREENS.map((screen) => (
          <Route
            key={screen.key}
            path={screen.path}
            element={<AuthzProvider fallback={<Splash />}>{PAGE_BY_KEY[screen.key]}</AuthzProvider>}
          />
        ))}
        <Route
          path="*"
          element={
            <AuthzProvider fallback={<Splash />}>
              <SignedIn />
            </AuthzProvider>
          }
        />
      </Routes>
    </>
  );
}

function ForbiddenWiring(): null {
  const navigate = useNavigate();
  useEffect(() => {
    setForbiddenNavigator(() => navigate("/forbidden", { replace: true }));
  }, [navigate]);
  return null;
}

function SignedIn(): ReactElement {
  const { signedIn } = useAuthz();
  const scopes = useScopes();

  // Only a MISSING session starts a sign-in; currentUser() already tried a renew.
  useEffect(() => {
    if (!signedIn) void signIn();
  }, [signedIn]);

  if (!signedIn) return <Splash />;

  // NoAccess REPLACES the shell: no navbar or empty rail around it.
  if (!hasScopedReach(scopes, signedIn)) {
    return (
      <GateLayout>
        <NoAccess appName={APP_NAME} />
      </GateLayout>
    );
  }

  const reachable = reachableScreens(scopes, signedIn);
  const landing = (reachable.find((s) => !s.public && s.loads !== null && !s.path.includes(":")) ?? reachable[0]).path;

  return (
    <MeProvider>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<Navigate to={landing} replace />} />
          {SCREEN_ROUTES.map((screen) => {
            if (screen.public) return null;
            const page = PAGE_BY_KEY[screen.key];
            if (screen.loads === null) {
              return <Route key={screen.key} path={screen.path} element={page} />;
            }
            return (
              <Route key={screen.key} element={<RequireOperation op={screen.loads} screen={screen.label} />}>
                <Route path={screen.path} element={page} />
              </Route>
            );
          })}
          {/* Forbidden is INSIDE the shell: the rail the caller can use stays. */}
          <Route path="/forbidden" element={<Forbidden />} />
          <Route path="*" element={<Navigate to={landing} replace />} />
        </Route>
      </Routes>
    </MeProvider>
  );
}
