import { http, HttpResponse } from "msw";
import type { components } from "../src/generated/onboarding-api";

type Me = components["schemas"]["Me"];

// State lives in the page: a full page load re-runs this module and restores
// the seed data. Only in-app navigation carries a change forward.

// The mock token is `mock:<role names joined by +>;<scopes>` (mock/authz/session.ts).
function roleOf(header: string | null): string {
  const token = header?.replace(/^Bearer\s+/i, "") ?? "";
  if (!token.startsWith("mock:")) return "";
  return decodeURIComponent(token.slice("mock:".length).split(";")[0] ?? "").split("+")[0] ?? "";
}

const people: Record<string, Me> = {
  "HR Coordinator": { username: "test-hr-coordinator", displayName: "Grace Liu", department: null },
  "IT Task Owner": { username: "test-it-task-owner", displayName: "Sam Torres", department: "IT" },
  "HR Task Owner": { username: "test-hr-task-owner", displayName: "Priya Nair", department: "HR" },
  "Facilities Task Owner": { username: "test-facilities-task-owner", displayName: "Omar Haddad", department: "Facilities" },
};

export const handlers = [
  http.get("/api/me", ({ request }) => {
    const person = people[roleOf(request.headers.get("authorization"))];
    return HttpResponse.json(person ?? { username: "mock-user", displayName: "Mock user", department: null });
  }),
  http.get("/api/health", () => new HttpResponse(null, { status: 200 })),
];
