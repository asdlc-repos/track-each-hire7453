import { http, HttpResponse } from "msw";
import type { components } from "../src/generated/onboarding-api";

type Me = components["schemas"]["Me"];
type Plan = components["schemas"]["Plan"];
type PlanSummary = components["schemas"]["PlanSummary"];
type Task = components["schemas"]["Task"];
type TemplateTask = components["schemas"]["TemplateTask"];
type Department = components["schemas"]["Department"];

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
  "HR Task Owner": { username: "test-hr-task-owner", displayName: "Hana Ito", department: "HR" },
  "Facilities Task Owner": { username: "test-facilities-task-owner", displayName: "Omar Haddad", department: "Facilities" },
};

// --- F1 demo data, from the prototype's records -------------------------------

const DAY = 86_400_000;
const toDay = (iso: string): number => Date.parse(`${iso}T00:00:00Z`) / DAY;
const fromDay = (n: number): string => new Date(n * DAY).toISOString().slice(0, 10);
const addDays = (iso: string, days: number): string => fromDay(toDay(iso) + days);
const todayIso = (): string => new Date().toISOString().slice(0, 10);

const plans: Plan[] = [
  { id: "plan-1", hireName: "Maya Fernando", jobTitle: "Software Engineer", department: "Engineering", managerName: "Ravi Perera", startDate: "2026-01-12", status: "active" },
  { id: "plan-2", hireName: "Daniel Okoye", jobTitle: "Account Executive", department: "Sales", managerName: "Priya Nair", startDate: "2026-01-26", status: "active" },
  { id: "plan-3", hireName: "Chen Wei", jobTitle: "Product Designer", department: "Product", managerName: "Ana Silva", startDate: "2026-01-05", status: "active" },
  { id: "plan-4", hireName: "Lena Fischer", jobTitle: "Financial Analyst", department: "Finance", managerName: "Tom Reed", startDate: "2026-02-02", status: "cancelled" },
];

interface StoredTask {
  id: string;
  planId: string;
  title: string;
  department: Department;
  dueOffsetDays: number;
  status: "todo" | "done";
  claimedBy: string | null;
  completedBy: string | null;
  completedAt: string | null;
  note: string | null;
}

const seedTask = (
  id: string,
  planId: string,
  title: string,
  department: Department,
  dueOffsetDays: number,
  status: "todo" | "done",
  claimedBy: string | null,
  note: string | null = null,
): StoredTask => ({
  id,
  planId,
  title,
  department,
  dueOffsetDays,
  status,
  claimedBy,
  completedBy: status === "done" ? claimedBy : null,
  completedAt: status === "done" ? "2026-01-09T09:00:00Z" : null,
  note,
});

const storedTasks: StoredTask[] = [
  seedTask("task-1", "plan-1", "Set up laptop", "IT", -3, "todo", "Sam Torres"),
  seedTask("task-2", "plan-1", "Create email account", "IT", 0, "done", "Sam Torres", "maya.fernando@acme.example"),
  seedTask("task-3", "plan-1", "Sign employment contract", "HR", 0, "todo", null),
  seedTask("task-4", "plan-1", "Assign desk", "Facilities", -3, "done", "Nina Patel", "Desk 4B"),
  seedTask("task-5", "plan-1", "Issue building badge", "Facilities", 0, "todo", "Nina Patel"),
  seedTask("task-6", "plan-2", "Set up laptop", "IT", -3, "todo", null),
  seedTask("task-7", "plan-2", "Run orientation session", "HR", 1, "todo", null),
  seedTask("task-8", "plan-2", "Assign desk", "Facilities", -3, "todo", null),
  seedTask("task-9", "plan-3", "Set up laptop", "IT", -3, "done", "Sam Torres"),
  seedTask("task-10", "plan-3", "Run orientation session", "HR", 1, "done", "Hana Ito"),
  seedTask("task-11", "plan-3", "Assign desk", "Facilities", -3, "done", "Nina Patel"),
  seedTask("task-12", "plan-4", "Set up laptop", "IT", -3, "todo", null),
];

// The real API's template starts empty; the mock carries the prototype's demo checklist.
const template: TemplateTask[] = [
  { id: "tpl-1", title: "Set up laptop", department: "IT", dueOffsetDays: -3 },
  { id: "tpl-2", title: "Create email account", department: "IT", dueOffsetDays: 0 },
  { id: "tpl-3", title: "Sign employment contract", department: "HR", dueOffsetDays: 0 },
  { id: "tpl-4", title: "Run orientation session", department: "HR", dueOffsetDays: 1 },
  { id: "tpl-5", title: "Assign desk", department: "Facilities", dueOffsetDays: -3 },
  { id: "tpl-6", title: "Issue building badge", department: "Facilities", dueOffsetDays: 0 },
];

let nextId = 100;
const newId = (prefix: string): string => `${prefix}-${nextId++}`;

const problem = (status: number, message: string, description?: string): Response =>
  HttpResponse.json({ code: status, message, ...(description ? { description } : {}) }, { status });

function toTask(t: StoredTask, caller?: Me): Task {
  const plan = plans.find((p) => p.id === t.planId)!;
  const dueDate = addDays(plan.startDate, t.dueOffsetDays);
  const late = t.status === "todo" ? toDay(todayIso()) - toDay(dueDate) : 0;
  return {
    id: t.id,
    planId: t.planId,
    hireName: plan.hireName,
    title: t.title,
    department: t.department,
    dueOffsetDays: t.dueOffsetDays,
    dueDate,
    status: t.status,
    daysOverdue: late > 0 ? late : 0,
    claimedBy: t.claimedBy,
    claimedByMe: caller !== undefined && t.claimedBy !== null && t.claimedBy === caller.displayName,
    completedBy: t.completedBy,
    completedAt: t.completedAt,
    note: t.note,
  };
}

function summarize(plan: Plan): PlanSummary {
  const mine = storedTasks.filter((t) => t.planId === plan.id).map((t) => toTask(t));
  const open = mine.filter((t) => t.status === "todo");
  const count = (d: Department): number => open.filter((t) => t.department === d).length;
  return {
    ...plan,
    totalTasks: mine.length,
    doneTasks: mine.length - open.length,
    overdueTasks: open.filter((t) => t.daysOverdue > 0).length,
    outstandingByDepartment: { IT: count("IT"), HR: count("HR"), Facilities: count("Facilities") },
    complete: mine.length > 0 && open.length === 0,
  };
}

function page<T>(url: URL, items: T[]): { count: number; next: null; previous: null; data: T[] } {
  const limit = Math.min(Math.max(Number(url.searchParams.get("limit") ?? 20) || 20, 1), 100);
  const offset = Math.max(Number(url.searchParams.get("offset") ?? 0) || 0, 0);
  return { count: items.length, next: null, previous: null, data: items.slice(offset, offset + limit) };
}

const DEPARTMENTS: Department[] = ["IT", "HR", "Facilities"];

/** Returns a 400 response when the body is not a valid checklist task, else the task fields. */
function readTaskBody(body: unknown): { title: string; department: Department; dueOffsetDays: number } | Response {
  const b = (body ?? {}) as Record<string, unknown>;
  if (typeof b.title !== "string" || b.title.trim() === "") return problem(400, "Invalid task", "title is required");
  if (!DEPARTMENTS.includes(b.department as Department)) return problem(400, "Invalid task", "department must be IT, HR or Facilities");
  if (!Number.isInteger(b.dueOffsetDays)) return problem(400, "Invalid task", "dueOffsetDays must be a whole number");
  return { title: b.title.trim(), department: b.department as Department, dueOffsetDays: b.dueOffsetDays as number };
}

const isDate = (v: unknown): v is string => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v));

const callerOf = (request: Request): Me | undefined => people[roleOf(request.headers.get("authorization"))];

/** The caller's department task: 404 when it is not found, in another department or in a cancelled plan. */
function departmentTask(request: Request, taskId: unknown): { task: StoredTask; caller: Me } | Response {
  const caller = callerOf(request);
  if (!caller?.department) return problem(403, "Forbidden", "The caller has no department");
  const task = storedTasks.find((t) => t.id === taskId);
  const plan = task ? plans.find((p) => p.id === task.planId) : undefined;
  if (!task || !plan || plan.status !== "active" || task.department !== caller.department) return problem(404, "Task not found");
  return { task, caller };
}

export const handlers = [
  http.get("/api/tasks", ({ request }) => {
    const url = new URL(request.url);
    const department = url.searchParams.get("department");
    if (department !== null && !DEPARTMENTS.includes(department as Department)) return problem(400, "Invalid department", "department must be IT, HR or Facilities");
    const overdueOnly = url.searchParams.get("overdue") === "true";
    const list = storedTasks
      .filter((t) => plans.find((p) => p.id === t.planId)?.status === "active")
      .map((t) => toTask(t))
      .filter((t) => department === null || t.department === department)
      .filter((t) => !overdueOnly || t.daysOverdue > 0)
      .sort((a, b) => b.daysOverdue - a.daysOverdue || a.dueDate.localeCompare(b.dueDate));
    return HttpResponse.json(page(url, list));
  }),
  http.get("/api/me/department/tasks", ({ request }) => {
    const url = new URL(request.url);
    const caller = callerOf(request);
    if (!caller?.department) return problem(403, "Forbidden", "The caller has no department");
    const status = url.searchParams.get("status") ?? "todo";
    if (!["todo", "done", "all"].includes(status)) return problem(400, "Invalid status", "status must be todo, done or all");
    const list = storedTasks
      .filter((t) => t.department === caller.department && plans.find((p) => p.id === t.planId)?.status === "active")
      .map((t) => toTask(t, caller))
      .filter((t) => status === "all" || t.status === status)
      .filter((t) => url.searchParams.get("overdue") !== "true" || t.daysOverdue > 0)
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
    return HttpResponse.json(page(url, list));
  }),
  http.get("/api/me/department/tasks/:taskId", ({ params, request }) => {
    const hit = departmentTask(request, params.taskId);
    return hit instanceof Response ? hit : HttpResponse.json(toTask(hit.task, hit.caller));
  }),
  http.post("/api/me/department/tasks/:taskId/claim", ({ params, request }) => {
    const hit = departmentTask(request, params.taskId);
    if (hit instanceof Response) return hit;
    hit.task.claimedBy = hit.caller.displayName;
    return HttpResponse.json(toTask(hit.task, hit.caller));
  }),
  http.post("/api/me/department/tasks/:taskId/release", ({ params, request }) => {
    const hit = departmentTask(request, params.taskId);
    if (hit instanceof Response) return hit;
    if (hit.task.claimedBy === hit.caller.displayName) hit.task.claimedBy = null;
    return HttpResponse.json(toTask(hit.task, hit.caller));
  }),
  http.post("/api/me/department/tasks/:taskId/complete", ({ params, request }) => {
    const hit = departmentTask(request, params.taskId);
    if (hit instanceof Response) return hit;
    if (hit.task.status !== "done") {
      hit.task.status = "done";
      hit.task.completedBy = hit.caller.displayName;
      hit.task.completedAt = new Date().toISOString();
    }
    return HttpResponse.json(toTask(hit.task, hit.caller));
  }),
  http.post("/api/me/department/tasks/:taskId/reopen", ({ params, request }) => {
    const hit = departmentTask(request, params.taskId);
    if (hit instanceof Response) return hit;
    hit.task.status = "todo";
    hit.task.completedBy = null;
    hit.task.completedAt = null;
    return HttpResponse.json(toTask(hit.task, hit.caller));
  }),
  http.put("/api/me/department/tasks/:taskId/note", async ({ params, request }) => {
    const hit = departmentTask(request, params.taskId);
    if (hit instanceof Response) return hit;
    const b = (await request.json()) as Record<string, unknown>;
    if (typeof b.note !== "string") return problem(400, "Invalid note", "note is required");
    hit.task.note = b.note.trim() === "" ? null : b.note.trim();
    return HttpResponse.json(toTask(hit.task, hit.caller));
  }),
  http.get("/api/plans", ({ request }) => {
    const url = new URL(request.url);
    const includeClosed = url.searchParams.get("includeClosed") === "true";
    let list = plans.map(summarize).filter((s) => includeClosed || (s.status === "active" && !s.complete));
    list = url.searchParams.get("sort") === "overdueTasks"
      ? list.sort((a, b) => b.overdueTasks - a.overdueTasks)
      : list.sort((a, b) => a.startDate.localeCompare(b.startDate));
    return HttpResponse.json(page(url, list));
  }),
  http.post("/api/plans", async ({ request }) => {
    const b = (await request.json()) as Record<string, unknown>;
    for (const key of ["hireName", "jobTitle", "department", "managerName"]) {
      if (typeof b[key] !== "string" || (b[key] as string).trim() === "") return problem(400, "Invalid plan", `${key} is required`);
    }
    if (!isDate(b.startDate)) return problem(400, "Invalid plan", "startDate must be a date (YYYY-MM-DD)");
    const plan: Plan = {
      id: newId("plan"),
      hireName: (b.hireName as string).trim(),
      jobTitle: (b.jobTitle as string).trim(),
      department: (b.department as string).trim(),
      managerName: (b.managerName as string).trim(),
      startDate: b.startDate,
      status: "active",
    };
    plans.push(plan);
    for (const t of template) {
      storedTasks.push({ id: newId("task"), planId: plan.id, title: t.title, department: t.department, dueOffsetDays: t.dueOffsetDays, status: "todo", claimedBy: null, completedBy: null, completedAt: null, note: null });
    }
    return HttpResponse.json(summarize(plan), { status: 201 });
  }),
  http.get("/api/plans/:planId", ({ params }) => {
    const plan = plans.find((p) => p.id === params.planId);
    return plan ? HttpResponse.json(summarize(plan)) : problem(404, "Plan not found");
  }),
  http.patch("/api/plans/:planId", async ({ params, request }) => {
    const plan = plans.find((p) => p.id === params.planId);
    if (!plan) return problem(404, "Plan not found");
    const b = (await request.json()) as Record<string, unknown>;
    if (b.startDate !== undefined && !isDate(b.startDate)) return problem(400, "Invalid plan", "startDate must be a date (YYYY-MM-DD)");
    for (const key of ["hireName", "jobTitle", "department", "managerName"] as const) {
      const v = b[key];
      if (v === undefined) continue;
      if (typeof v !== "string" || v.trim() === "") return problem(400, "Invalid plan", `${key} must not be empty`);
      plan[key] = v.trim();
    }
    // Due dates are derived from the start date and each task's offset, so they shift with it.
    if (typeof b.startDate === "string") plan.startDate = b.startDate;
    return HttpResponse.json(summarize(plan));
  }),
  http.post("/api/plans/:planId/cancel", ({ params }) => {
    const plan = plans.find((p) => p.id === params.planId);
    if (!plan) return problem(404, "Plan not found");
    plan.status = "cancelled";
    return HttpResponse.json(summarize(plan));
  }),
  http.get("/api/plans/:planId/tasks", ({ params, request }) => {
    if (!plans.some((p) => p.id === params.planId)) return problem(404, "Plan not found");
    return HttpResponse.json(page(new URL(request.url), storedTasks.filter((t) => t.planId === params.planId).map((t) => toTask(t))));
  }),
  http.post("/api/plans/:planId/tasks", async ({ params, request }) => {
    const plan = plans.find((p) => p.id === params.planId);
    if (!plan) return problem(404, "Plan not found");
    if (plan.status !== "active") return problem(400, "Plan is cancelled", "Tasks can only be added to an active plan");
    const body = readTaskBody(await request.json());
    if (body instanceof Response) return body;
    const task: StoredTask = { id: newId("task"), planId: plan.id, ...body, status: "todo", claimedBy: null, completedBy: null, completedAt: null, note: null };
    storedTasks.push(task);
    return HttpResponse.json(toTask(task), { status: 201 });
  }),
  http.put("/api/plans/:planId/tasks/:taskId", async ({ params, request }) => {
    const plan = plans.find((p) => p.id === params.planId);
    const task = storedTasks.find((t) => t.id === params.taskId && t.planId === params.planId);
    if (!plan || !task) return problem(404, "Task not found");
    if (plan.status !== "active") return problem(400, "Plan is cancelled", "Tasks can only be changed on an active plan");
    const body = readTaskBody({ title: task.title, department: task.department, dueOffsetDays: task.dueOffsetDays, ...((await request.json()) as object) });
    if (body instanceof Response) return body;
    Object.assign(task, body);
    return HttpResponse.json(toTask(task));
  }),
  http.delete("/api/plans/:planId/tasks/:taskId", ({ params }) => {
    const plan = plans.find((p) => p.id === params.planId);
    const index = storedTasks.findIndex((t) => t.id === params.taskId && t.planId === params.planId);
    if (!plan || index < 0) return problem(404, "Task not found");
    if (plan.status !== "active") return problem(400, "Plan is cancelled", "Tasks can only be removed from an active plan");
    storedTasks.splice(index, 1);
    return new HttpResponse(null, { status: 204 });
  }),
  http.get("/api/template-tasks", ({ request }) => HttpResponse.json(page(new URL(request.url), template))),
  http.post("/api/template-tasks", async ({ request }) => {
    const body = readTaskBody(await request.json());
    if (body instanceof Response) return body;
    const task: TemplateTask = { id: newId("tpl"), ...body };
    template.push(task);
    return HttpResponse.json(task, { status: 201 });
  }),
  http.put("/api/template-tasks/:templateTaskId", async ({ params, request }) => {
    const task = template.find((t) => t.id === params.templateTaskId);
    if (!task) return problem(404, "Template task not found");
    const body = readTaskBody(await request.json());
    if (body instanceof Response) return body;
    Object.assign(task, body);
    return HttpResponse.json(task);
  }),
  http.delete("/api/template-tasks/:templateTaskId", ({ params }) => {
    const index = template.findIndex((t) => t.id === params.templateTaskId);
    if (index < 0) return problem(404, "Template task not found");
    template.splice(index, 1);
    return new HttpResponse(null, { status: 204 });
  }),
  http.get("/api/me", ({ request }) => {
    const person = people[roleOf(request.headers.get("authorization"))];
    return HttpResponse.json(person ?? { username: "mock-user", displayName: "Mock user", department: null });
  }),
  http.get("/api/health", () => new HttpResponse(null, { status: 200 })),
];
