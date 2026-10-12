import type { ReactElement } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { AppShell, ColorSchemeToggle, Divider, Footer, Header, Sidebar, UserMenu } from "@wso2/oxygen-ui";
import { ClipboardList, LayoutDashboard, ListChecks, ListTodo, TriangleAlert, User } from "@wso2/oxygen-ui-icons-react";
import { Can } from "../authz/gates";
import { SCREEN_ROUTES } from "../authz/screens";
import { signOut } from "../authz/session";
import { APP_NAME } from "../appName";
import { useOverdueCounts } from "../lib/overdue";
import { useMe } from "./Me";

// The rail: one gated list. Labels are the prototype's nav labels.
const RAIL = [
  { key: "dashboard", label: "Progress dashboard", icon: <LayoutDashboard size={18} /> },
  { key: "plans", label: "Onboarding plans", icon: <ClipboardList size={18} /> },
  { key: "overdue", label: "Overdue tasks", icon: <TriangleAlert size={18} /> },
  { key: "template", label: "Checklist template", icon: <ListChecks size={18} /> },
  { key: "my-tasks", label: "My tasks", icon: <ListTodo size={18} /> },
] as const;

function activeKey(pathname: string): string {
  // Longest path prefix wins, so /plans/abc is "plans" and /my-tasks/t1 is "my-tasks".
  const hit = RAIL.map((item) => SCREEN_ROUTES.find((s) => s.key === item.key)!)
    .filter((s) => pathname === s.path || pathname.startsWith(`${s.path}/`))
    .sort((a, b) => b.path.length - a.path.length)[0];
  return hit?.key ?? "";
}

export function AppLayout(): ReactElement {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { me } = useMe();
  const name = me?.displayName ?? "Signed in";
  const email = me?.username ?? "";
  const overdue = useOverdueCounts(pathname);
  const labelOf = (key: string, label: string): string => {
    if (key === "overdue" && overdue.all) return `${label} (${overdue.all})`;
    if (key === "my-tasks" && overdue.mine) return `${label} (${overdue.mine} overdue)`;
    return label;
  };

  return (
    <AppShell>
      <AppShell.Navbar>
        <Header>
          <Header.Toggle />
          <Header.Brand>
            <Header.BrandTitle>{APP_NAME}</Header.BrandTitle>
          </Header.Brand>
          <Header.Spacer />
          <Header.Actions>
            <ColorSchemeToggle />
            <Divider orientation="vertical" flexItem sx={{ mx: 2 }} />
            <UserMenu>
              <UserMenu.Trigger name={name} />
              <UserMenu.Header name={name} email={email} />
              <UserMenu.Item icon={<User size={16} />} label="Account" onClick={() => navigate("/account")} />
              <UserMenu.Divider />
              <UserMenu.Logout label="Sign out" onClick={() => void signOut()} />
            </UserMenu>
          </Header.Actions>
        </Header>
      </AppShell.Navbar>

      <AppShell.Sidebar>
        <Sidebar activeItem={activeKey(pathname)}>
          <Sidebar.Nav>
            <Sidebar.Category>
              {RAIL.map((item) => {
                const screen = SCREEN_ROUTES.find((s) => s.key === item.key)!;
                return (
                  <Can key={item.key} op={screen.loads!}>
                    <Sidebar.Item id={item.key} link={<Link to={screen.path} />}>
                      <Sidebar.ItemIcon>{item.icon}</Sidebar.ItemIcon>
                      <Sidebar.ItemLabel>{labelOf(item.key, item.label)}</Sidebar.ItemLabel>
                    </Sidebar.Item>
                  </Can>
                );
              })}
            </Sidebar.Category>
          </Sidebar.Nav>
        </Sidebar>
      </AppShell.Sidebar>

      <AppShell.Main>
        <Outlet />
      </AppShell.Main>

      <AppShell.Footer>
        <Footer>
          <Footer.Copyright>© WSO2 LLC</Footer.Copyright>
        </Footer>
      </AppShell.Footer>
    </AppShell>
  );
}
