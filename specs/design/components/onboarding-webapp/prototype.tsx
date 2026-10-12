import { useState, type ReactNode } from "react";
import {
  Alert, AppShell, Breadcrumbs, Button, Detail, Dialog, EmptyState, Field, Filters, Form, Heading,
  Screen, Section, Stat, StatGroup, Table, Text, ValidationSummary, defineApp, useCollection,
  useDisplayState, useNav, useParams, useRole, useToday,
} from "@wso2/prototype-kit";

interface Plan {
  id: string;
  hire: string;
  jobTitle: string;
  department: string;
  manager: string;
  startDate: string;
  status: string;
}

interface Task {
  id: string;
  planId: string;
  hire: string;
  title: string;
  department: string;
  dueDate: string;
  offset: number;
  status: string;
  claimedBy: string;
  completedBy: string;
  note: string;
}

interface TemplateTask {
  id: string;
  title: string;
  department: string;
  offset: number;
}

type ToneName = "default" | "info" | "success" | "warning" | "error";

const plans: Plan[] = [
  { id: "plan-1", hire: "Maya Fernando", jobTitle: "Software Engineer", department: "Engineering", manager: "Ravi Perera", startDate: "2026-01-12", status: "Active" },
  { id: "plan-2", hire: "Daniel Okoye", jobTitle: "Account Executive", department: "Sales", manager: "Priya Nair", startDate: "2026-01-26", status: "Active" },
  { id: "plan-3", hire: "Chen Wei", jobTitle: "Product Designer", department: "Product", manager: "Ana Silva", startDate: "2026-01-05", status: "Active" },
  { id: "plan-4", hire: "Lena Fischer", jobTitle: "Financial Analyst", department: "Finance", manager: "Tom Reed", startDate: "2026-02-02", status: "Cancelled" },
];

const tasks: Task[] = [
  { id: "task-1", planId: "plan-1", hire: "Maya Fernando", title: "Set up laptop", department: "IT", dueDate: "2026-01-09", offset: -3, status: "To do", claimedBy: "Sam Torres", completedBy: "", note: "" },
  { id: "task-2", planId: "plan-1", hire: "Maya Fernando", title: "Create email account", department: "IT", dueDate: "2026-01-12", offset: 0, status: "Done", claimedBy: "Sam Torres", completedBy: "Sam Torres", note: "maya.fernando@acme.example" },
  { id: "task-3", planId: "plan-1", hire: "Maya Fernando", title: "Sign employment contract", department: "HR", dueDate: "2026-01-12", offset: 0, status: "To do", claimedBy: "", completedBy: "", note: "" },
  { id: "task-4", planId: "plan-1", hire: "Maya Fernando", title: "Assign desk", department: "Facilities", dueDate: "2026-01-09", offset: -3, status: "Done", claimedBy: "Nina Patel", completedBy: "Nina Patel", note: "Desk 4B" },
  { id: "task-5", planId: "plan-1", hire: "Maya Fernando", title: "Issue building badge", department: "Facilities", dueDate: "2026-01-12", offset: 0, status: "To do", claimedBy: "Nina Patel", completedBy: "", note: "" },
  { id: "task-6", planId: "plan-2", hire: "Daniel Okoye", title: "Set up laptop", department: "IT", dueDate: "2026-01-23", offset: -3, status: "To do", claimedBy: "", completedBy: "", note: "" },
  { id: "task-7", planId: "plan-2", hire: "Daniel Okoye", title: "Run orientation session", department: "HR", dueDate: "2026-01-27", offset: 1, status: "To do", claimedBy: "", completedBy: "", note: "" },
  { id: "task-8", planId: "plan-2", hire: "Daniel Okoye", title: "Assign desk", department: "Facilities", dueDate: "2026-01-23", offset: -3, status: "To do", claimedBy: "", completedBy: "", note: "" },
  { id: "task-9", planId: "plan-3", hire: "Chen Wei", title: "Set up laptop", department: "IT", dueDate: "2026-01-02", offset: -3, status: "Done", claimedBy: "Sam Torres", completedBy: "Sam Torres", note: "" },
  { id: "task-10", planId: "plan-3", hire: "Chen Wei", title: "Run orientation session", department: "HR", dueDate: "2026-01-06", offset: 1, status: "Done", claimedBy: "Hana Ito", completedBy: "Hana Ito", note: "" },
  { id: "task-11", planId: "plan-3", hire: "Chen Wei", title: "Assign desk", department: "Facilities", dueDate: "2026-01-02", offset: -3, status: "Done", claimedBy: "Nina Patel", completedBy: "Nina Patel", note: "" },
  { id: "task-12", planId: "plan-4", hire: "Lena Fischer", title: "Set up laptop", department: "IT", dueDate: "2026-01-30", offset: -3, status: "To do", claimedBy: "", completedBy: "", note: "" },
];

const templateTasks: TemplateTask[] = [
  { id: "tpl-1", title: "Set up laptop", department: "IT", offset: -3 },
  { id: "tpl-2", title: "Create email account", department: "IT", offset: 0 },
  { id: "tpl-3", title: "Sign employment contract", department: "HR", offset: 0 },
  { id: "tpl-4", title: "Run orientation session", department: "HR", offset: 1 },
  { id: "tpl-5", title: "Assign desk", department: "Facilities", offset: -3 },
  { id: "tpl-6", title: "Issue building badge", department: "Facilities", offset: 0 },
];

const departmentOf: Record<string, string> = {
  "IT Task Owner": "IT",
  "HR Task Owner": "HR",
  "Facilities Task Owner": "Facilities",
};

const people: Record<string, { name: string; email: string }> = {
  "HR Coordinator": { name: "Grace Liu", email: "grace.liu@acme.example" },
  "IT Task Owner": { name: "Sam Torres", email: "sam.torres@acme.example" },
  "HR Task Owner": { name: "Hana Ito", email: "hana.ito@acme.example" },
  "Facilities Task Owner": { name: "Nina Patel", email: "nina.patel@acme.example" },
};

function dayNumber(iso: string): number {
  const parts = iso.split("-");
  const year = Number(parts[0]);
  const month = Number(parts[1]);
  const day = Number(parts[2]);
  const y = month <= 2 ? year - 1 : year;
  const era = Math.floor(y / 400);
  const yoe = y - era * 400;
  const mp = (month + 9) % 12;
  const doy = Math.floor((153 * mp + 2) / 5) + day - 1;
  const doe = yoe * 365 + Math.floor(yoe / 4) - Math.floor(yoe / 100) + doy;
  return era * 146097 + doe;
}

function fromDayNumber(n: number): string {
  const era = Math.floor(n / 146097);
  const doe = n - era * 146097;
  const yoe = Math.floor((doe - Math.floor(doe / 1460) + Math.floor(doe / 36524) - Math.floor(doe / 146096)) / 365);
  const doy = doe - (365 * yoe + Math.floor(yoe / 4) - Math.floor(yoe / 100));
  const mp = Math.floor((5 * doy + 2) / 153);
  const day = doy - Math.floor((153 * mp + 2) / 5) + 1;
  const month = mp < 10 ? mp + 3 : mp - 9;
  const year = yoe + era * 400 + (month <= 2 ? 1 : 0);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function addDays(iso: string, days: number): string {
  return fromDayNumber(dayNumber(iso) + days);
}

function isOverdue(t: Task, today: string): boolean {
  return t.status === "To do" && t.dueDate < today;
}

function daysOverdue(t: Task, today: string): number {
  return dayNumber(today) - dayNumber(t.dueDate);
}

function activeTasks(all: readonly Task[], allPlans: readonly Plan[]): Task[] {
  const activeIds = allPlans.filter((p) => p.status === "Active").map((p) => p.id);
  return all.filter((t) => activeIds.includes(t.planId));
}

function taskStatus(t: Task, today: string): { text: string; tone: ToneName } {
  if (t.status === "Done") return { text: "Done", tone: "success" };
  if (isOverdue(t, today)) return { text: `${daysOverdue(t, today)} days overdue`, tone: "error" };
  return { text: "To do", tone: "default" };
}

function offsetText(offset: number): string {
  if (offset < 0) return `${-offset} days before start`;
  if (offset === 0) return "On the start date";
  return `${offset} days after start`;
}

interface Summary {
  plan: Plan;
  total: number;
  done: number;
  overdue: number;
  it: number;
  hr: number;
  facilities: number;
}

function summarize(plan: Plan, all: readonly Task[], today: string): Summary {
  const mine = all.filter((t) => t.planId === plan.id);
  const open = mine.filter((t) => t.status === "To do");
  return {
    plan,
    total: mine.length,
    done: mine.length - open.length,
    overdue: open.filter((t) => t.dueDate < today).length,
    it: open.filter((t) => t.department === "IT").length,
    hr: open.filter((t) => t.department === "HR").length,
    facilities: open.filter((t) => t.department === "Facilities").length,
  };
}

function isComplete(s: Summary): boolean {
  return s.total > 0 && s.done === s.total;
}

function planStatus(s: Summary): { text: string; tone: ToneName } {
  if (s.plan.status === "Cancelled") return { text: "Cancelled", tone: "default" };
  if (isComplete(s)) return { text: "Complete", tone: "success" };
  if (s.overdue > 0) return { text: `${s.overdue} overdue`, tone: "error" };
  return { text: "On track", tone: "info" };
}

function Shell({ children }: { children: ReactNode }) {
  const role = useRole();
  const today = useToday();
  const allTasks = useCollection<Task>("tasks");
  const allPlans = useCollection<Plan>("plans");
  const person = people[role] ?? { name: "Grace Liu", email: "grace.liu@acme.example" };
  const department = departmentOf[role];
  const live = activeTasks(allTasks.items, allPlans.items);
  const overdueAll = live.filter((t) => isOverdue(t, today)).length;
  const overdueMine = live.filter((t) => t.department === department && isOverdue(t, today)).length;
  return (
    <AppShell
      id="shell"
      user={person}
      nav={[
        { id: "nav.dashboard", label: "Progress dashboard", to: "screen.dashboard" },
        { id: "nav.plans", label: "Onboarding plans", to: "screen.plans" },
        { id: "nav.overdue", label: overdueAll > 0 ? `Overdue tasks (${overdueAll})` : "Overdue tasks", to: "screen.overdue" },
        { id: "nav.template", label: "Checklist template", to: "screen.template" },
        { id: "nav.my-tasks", label: overdueMine > 0 ? `My tasks (${overdueMine} overdue)` : "My tasks", to: "screen.my-tasks" },
      ]}
      account="screen.account"
      signOut="screen.signed-out"
    >
      {children}
    </AppShell>
  );
}

function Dashboard() {
  const state = useDisplayState();
  const today = useToday();
  const allPlans = useCollection<Plan>("plans");
  const allTasks = useCollection<Task>("tasks");
  const [showAll, setShowAll] = useState("No");
  const [sort, setSort] = useState("Start date");
  const summaries = allPlans.items.map((p) => summarize(p, allTasks.items, today));
  const active = summaries.filter((s) => s.plan.status === "Active" && !isComplete(s));
  const shown = (state === "state.empty" ? [] : summaries)
    .filter((s) => showAll === "Yes" || (s.plan.status === "Active" && !isComplete(s)))
    .sort((a, b) =>
      sort === "Overdue tasks" ? b.overdue - a.overdue : a.plan.startDate.localeCompare(b.plan.startDate),
    );
  return (
    <Shell>
      <Heading id="heading.dashboard" text="Progress dashboard" />
      {state === "state.failed" && (
        <Alert id="alert.dashboard-failed" tone="error" title="Progress could not be loaded" text="Refresh the page in a moment." />
      )}
      <StatGroup>
        <Stat id="stat.active" label="Hires onboarding" value={String(active.length)} hint="active plans in progress" icon="Users" />
        <Stat id="stat.hires-overdue" label="Hires with overdue tasks" value={String(active.filter((s) => s.overdue > 0).length)} hint="need a nudge" icon="TriangleAlert" tone="error" />
        <Stat id="stat.tasks-overdue" label="Overdue tasks" value={String(active.reduce((sum, s) => sum + s.overdue, 0))} hint="across all departments" icon="Clock" tone="warning" />
      </StatGroup>
      <Section id="section.progress" title="New hires" count={shown.length} subtitle="Open a hire to see their plan and tasks.">
        <Filters id="filters.dashboard">
          <Field id="field.show-all" label="Include completed and cancelled plans" type="select" options={["No", "Yes"]} value={showAll} onChange={setShowAll} />
          <Field id="field.sort" label="Sort by" type="select" options={["Start date", "Overdue tasks"]} value={sort} onChange={setSort} />
        </Filters>
        <Table
          id="table.progress"
          columns={["Hire", "Start date", "Progress", "Outstanding: IT / HR / Facilities", { label: "Status", kind: "status" }]}
          rows={shown.map((s) => ({
            id: `hire.${s.plan.id}`,
            cells: [s.plan.hire, s.plan.startDate, `${s.done} of ${s.total} done`, `${s.it} / ${s.hr} / ${s.facilities}`],
            status: planStatus(s),
            to: "screen.plan-detail",
            params: { plan: s.plan.id },
          }))}
          empty={<EmptyState id="empty.progress" title="No hires to show" text="Active onboarding plans appear here." />}
        />
      </Section>
    </Shell>
  );
}

function Plans() {
  const state = useDisplayState();
  const allPlans = useCollection<Plan>("plans");
  const shown = state === "state.empty" ? [] : allPlans.items;
  return (
    <Shell>
      <Heading id="heading.plans" text="Onboarding plans" />
      <Section
        id="section.plans"
        title="All plans"
        count={shown.length}
        subtitle="One plan per new hire, including cancelled ones."
        actions={<Button id="btn.new-plan" label="New plan" emphasis="primary" to="screen.plan-new" />}
      >
        <Table
          id="table.plans"
          columns={["Hire", "Role", "Department", "Start date", "Manager", { label: "Plan", kind: "status" }]}
          rows={shown.map((p) => ({
            id: `plan.${p.id}`,
            cells: [p.hire, p.jobTitle, p.department, p.startDate, p.manager],
            status: { text: p.status, tone: p.status === "Active" ? ("info" as const) : ("default" as const) },
            to: "screen.plan-detail",
            params: { plan: p.id },
          }))}
          empty={<EmptyState id="empty.plans" title="No onboarding plans yet" text="Create a plan when a new hire is confirmed." />}
        />
      </Section>
    </Shell>
  );
}

function PlanNew() {
  const state = useDisplayState();
  const today = useToday();
  const navigate = useNav();
  const allPlans = useCollection<Plan>("plans");
  const allTasks = useCollection<Task>("tasks");
  const template = useCollection<TemplateTask>("templateTasks");
  const invalid = state === "state.validation-error";
  return (
    <Shell>
      <Breadcrumbs
        id="crumbs.plan-new"
        items={[
          { id: "crumb.plans", label: "Onboarding plans", to: "screen.plans" },
          { id: "crumb.new", label: "New plan" },
        ]}
      />
      <Heading id="heading.plan-new" text="New onboarding plan" />
      <Alert id="alert.template" tone="info" text={`The checklist is copied from the standard template (${template.items.length} tasks). You can change it afterwards.`} />
      {invalid && (
        <ValidationSummary id="summary.plan-new" issues={["Enter the hire's name", "Choose a start date", "Enter the hire's manager"]} />
      )}
      <Form
        id="form.plan-new"
        title="New hire"
        onSubmit={(v) => {
          const hire = v.hire ?? "";
          const startDate = v.startDate || today;
          const id = allPlans.create({
            hire,
            jobTitle: v.jobTitle ?? "",
            department: v.department ?? "",
            manager: v.manager ?? "",
            startDate,
            status: "Active",
          });
          template.items.forEach((tt) =>
            allTasks.create({
              planId: id,
              hire,
              title: tt.title,
              department: tt.department,
              dueDate: addDays(startDate, tt.offset),
              offset: tt.offset,
              status: "To do",
              claimedBy: "",
              completedBy: "",
              note: "",
            }),
          );
          navigate.go("screen.plan-detail", { plan: id });
        }}
        actions={<Button id="btn.create-plan" label="Create plan" emphasis="primary" submit />}
      >
        <Field id="field.hire" name="hire" label="Name" required error={invalid ? "Enter the hire's name" : undefined} />
        <Field id="field.job-title" name="jobTitle" label="Role" required />
        <Field id="field.department" name="department" label="Department" required />
        <Field id="field.start-date" name="startDate" label="Start date" type="date" required error={invalid ? "Choose a start date" : undefined} />
        <Field id="field.manager" name="manager" label="Manager" required error={invalid ? "Enter the hire's manager" : undefined} />
      </Form>
    </Shell>
  );
}

function PlanDetail() {
  const { plan: id } = useParams();
  const state = useDisplayState();
  const today = useToday();
  const navigate = useNav();
  const allPlans = useCollection<Plan>("plans");
  const allTasks = useCollection<Task>("tasks");
  const [dialog, setDialog] = useState("");
  const [title, setTitle] = useState("");
  const [dept, setDept] = useState("IT");
  const [offset, setOffset] = useState("0");
  const [startOpen, setStartOpen] = useState(false);
  const [newStart, setNewStart] = useState("");
  const [cancelOpen, setCancelOpen] = useState(false);
  const plan = (id ? allPlans.get(id) : undefined) ?? allPlans.items[0]!;
  const planTasks = state === "state.empty" ? [] : allTasks.items.filter((t) => t.planId === plan.id);
  const active = plan.status === "Active";
  const invalid = state === "state.validation-error";

  const openNew = () => {
    setTitle("");
    setDept("IT");
    setOffset("0");
    setDialog("new");
  };
  const openEdit = (t: Task) => {
    setTitle(t.title);
    setDept(t.department);
    setOffset(String(t.offset));
    setDialog(t.id);
  };
  const saveTask = () => {
    if (title.trim() === "") return;
    const n = Number(offset) || 0;
    if (dialog === "new") {
      allTasks.create({
        planId: plan.id,
        hire: plan.hire,
        title,
        department: dept,
        dueDate: addDays(plan.startDate, n),
        offset: n,
        status: "To do",
        claimedBy: "",
        completedBy: "",
        note: "",
      });
    } else {
      allTasks.update(dialog, { title, department: dept, offset: n, dueDate: addDays(plan.startDate, n) });
    }
    setDialog("");
  };
  const saveStart = () => {
    if (newStart === "") return;
    allPlans.update(plan.id, { startDate: newStart });
    allTasks.items.filter((t) => t.planId === plan.id).forEach((t) => allTasks.update(t.id, { dueDate: addDays(newStart, t.offset) }));
    setStartOpen(false);
  };

  return (
    <Shell>
      <Breadcrumbs
        id="crumbs.plan-detail"
        items={[
          { id: "crumb.plans", label: "Onboarding plans", to: "screen.plans" },
          { id: "crumb.plan", label: plan.hire },
        ]}
      />
      <Heading
        id="heading.plan-detail"
        text={plan.hire}
        actions={
          active ? (
            <>
              <Button id="btn.change-start" label="Change start date" onPress={() => { setNewStart(plan.startDate); setStartOpen(true); }} />
              <Button id="btn.cancel-plan" label="Cancel plan" emphasis="danger" onPress={() => setCancelOpen(true)} />
            </>
          ) : undefined
        }
      />
      {!active && (
        <Alert id="alert.cancelled" tone="warning" title="This plan is cancelled" text="Its tasks no longer appear in task lists or reminders." />
      )}
      <Detail
        id="detail.plan"
        fields={[
          { label: "Role", value: plan.jobTitle },
          { label: "Department", value: plan.department },
          { label: "Manager", value: plan.manager },
          { label: "Start date", value: plan.startDate },
          { label: "Plan", value: plan.status },
        ]}
      />
      <Section
        id="section.plan-tasks"
        title="Tasks"
        count={planTasks.length}
        subtitle="Due dates follow the start date."
        actions={active ? <Button id="btn.add-task" label="Add task" emphasis="primary" onPress={openNew} /> : undefined}
      >
        <Table
          id="table.plan-tasks"
          columns={["Task", "Department", "Due date", "Claimed by", { label: "Status", kind: "status" }]}
          rows={planTasks.map((t) => ({
            id: `ptask.${t.id}`,
            cells: [t.title, t.department, t.dueDate, t.claimedBy === "" ? "Nobody yet" : t.claimedBy],
            status: taskStatus(t, today),
            actions: active
              ? [
                  { id: `ptask.${t.id}.edit`, label: "Edit", onPress: () => openEdit(t) },
                  { id: `ptask.${t.id}.remove`, label: "Remove", emphasis: "danger" as const, onPress: () => allTasks.remove(t.id) },
                ]
              : [],
          }))}
          empty={<EmptyState id="empty.plan-tasks" title="No tasks in this plan" text="Add a task or start from the template." />}
        />
      </Section>
      <Dialog id="dialog.task" title={dialog === "new" ? "Add task" : "Edit task"} open={dialog !== ""} onClose={() => setDialog("")}>
        <Form
          id="form.task"
          onSubmit={saveTask}
          actions={<Button id="btn.save-task" label="Save task" emphasis="primary" submit />}
        >
          <Field id="field.task-title" label="Task" required value={title} onChange={setTitle} error={invalid ? "Give the task a title" : undefined} />
          <Field id="field.task-department" label="Department" type="select" options={["IT", "HR", "Facilities"]} value={dept} onChange={setDept} />
          <Field id="field.task-offset" label="Due, in days from the start date (negative is before)" type="number" value={offset} onChange={setOffset} />
        </Form>
      </Dialog>
      <Dialog id="dialog.start" title="Change start date" open={startOpen} onClose={() => setStartOpen(false)}>
        <Form
          id="form.start"
          onSubmit={saveStart}
          actions={<Button id="btn.save-start" label="Save start date" emphasis="primary" submit />}
        >
          <Field id="field.new-start" label="New start date" type="date" required value={newStart} onChange={setNewStart} />
        </Form>
      </Dialog>
      <Dialog
        id="dialog.cancel"
        title={`Cancel the plan for ${plan.hire}?`}
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        actions={
          <>
            <Button id="btn.keep-plan" label="Keep plan" onPress={() => setCancelOpen(false)} />
            <Button
              id="btn.confirm-cancel"
              label="Cancel plan"
              emphasis="danger"
              onPress={() => {
                allPlans.update(plan.id, { status: "Cancelled" });
                setCancelOpen(false);
                navigate.go("screen.plans");
              }}
            />
          </>
        }
      >
        <Text id="text.cancel" text="The plan stays in the list, and its tasks disappear from task lists and reminders." />
      </Dialog>
    </Shell>
  );
}

function Template() {
  const state = useDisplayState();
  const template = useCollection<TemplateTask>("templateTasks");
  const [dialog, setDialog] = useState("");
  const [title, setTitle] = useState("");
  const [dept, setDept] = useState("IT");
  const [offset, setOffset] = useState("0");
  const shown = state === "state.empty" ? [] : template.items;
  const invalid = state === "state.validation-error";

  const openNew = () => {
    setTitle("");
    setDept("IT");
    setOffset("0");
    setDialog("new");
  };
  const openEdit = (t: TemplateTask) => {
    setTitle(t.title);
    setDept(t.department);
    setOffset(String(t.offset));
    setDialog(t.id);
  };
  const save = () => {
    if (title.trim() === "") return;
    const n = Number(offset) || 0;
    if (dialog === "new") {
      template.create({ title, department: dept, offset: n });
    } else {
      template.update(dialog, { title, department: dept, offset: n });
    }
    setDialog("");
  };

  return (
    <Shell>
      <Heading id="heading.template" text="Checklist template" />
      <Alert id="alert.template-scope" tone="info" text="Changes apply to plans created from now on. Existing plans keep the tasks they were created with." />
      <Section
        id="section.template"
        title="Standard checklist"
        count={shown.length}
        subtitle="Copied into every new onboarding plan."
        actions={<Button id="btn.add-template-task" label="Add task" emphasis="primary" onPress={openNew} />}
      >
        <Table
          id="table.template"
          columns={["Task", "Department", "Due"]}
          rows={shown.map((t) => ({
            id: `template.${t.id}`,
            cells: [t.title, t.department, offsetText(t.offset)],
            actions: [
              { id: `template.${t.id}.edit`, label: "Edit", onPress: () => openEdit(t) },
              { id: `template.${t.id}.remove`, label: "Remove", emphasis: "danger" as const, onPress: () => template.remove(t.id) },
            ],
          }))}
          empty={<EmptyState id="empty.template" title="The checklist is empty" text="Add the tasks every new hire needs." />}
        />
      </Section>
      <Dialog id="dialog.template-task" title={dialog === "new" ? "Add template task" : "Edit template task"} open={dialog !== ""} onClose={() => setDialog("")}>
        <Form
          id="form.template-task"
          onSubmit={save}
          actions={<Button id="btn.save-template-task" label="Save task" emphasis="primary" submit />}
        >
          <Field id="field.template-title" label="Task" required value={title} onChange={setTitle} error={invalid ? "Give the task a title" : undefined} />
          <Field id="field.template-department" label="Department" type="select" options={["IT", "HR", "Facilities"]} value={dept} onChange={setDept} />
          <Field id="field.template-offset" label="Due, in days from the start date (negative is before)" type="number" value={offset} onChange={setOffset} />
        </Form>
      </Dialog>
    </Shell>
  );
}

function Overdue() {
  const state = useDisplayState();
  const today = useToday();
  const allTasks = useCollection<Task>("tasks");
  const allPlans = useCollection<Plan>("plans");
  const late = (state === "state.empty" ? [] : activeTasks(allTasks.items, allPlans.items))
    .filter((t) => isOverdue(t, today))
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  return (
    <Shell>
      <Heading id="heading.overdue" text="Overdue tasks" />
      {state === "state.failed" && (
        <Alert id="alert.overdue-failed" tone="error" title="Overdue tasks could not be loaded" text="Refresh the page in a moment." />
      )}
      {late.length > 0 && (
        <Alert id="alert.overdue" tone="warning" title={`${late.length} tasks are overdue`} text="They stay here until the owning team marks them done." />
      )}
      <Section id="section.overdue" title="Overdue" count={late.length} subtitle="Most overdue first, across all hires.">
        <Table
          id="table.overdue"
          columns={["Hire", "Task", "Department", "Due date", { label: "Days overdue", kind: "number" }, "Claimed by"]}
          rows={late.map((t) => ({
            id: `late.${t.id}`,
            cells: [t.hire, t.title, t.department, t.dueDate, String(daysOverdue(t, today)), t.claimedBy === "" ? "Nobody yet" : t.claimedBy],
            to: "screen.plan-detail",
            params: { plan: t.planId },
          }))}
          empty={<EmptyState id="empty.overdue" title="Nothing is overdue" text="Overdue tasks appear here the day after their due date." />}
        />
      </Section>
    </Shell>
  );
}

function MyTasks() {
  const role = useRole();
  const state = useDisplayState();
  const today = useToday();
  const allTasks = useCollection<Task>("tasks");
  const allPlans = useCollection<Plan>("plans");
  const [view, setView] = useState("Open");
  const department = departmentOf[role] ?? "IT";
  const me = people[role]?.name ?? "Sam Torres";
  const mine = activeTasks(allTasks.items, allPlans.items).filter((t) => t.department === department);
  const overdue = mine.filter((t) => isOverdue(t, today));
  const shown = (state === "state.empty" ? [] : mine)
    .filter((t) => view === "All" || (view === "Open" ? t.status === "To do" : t.status === "Done"))
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  return (
    <Shell>
      <Heading id="heading.my-tasks" text={`${department} tasks`} />
      {state === "state.failed" && (
        <Alert id="alert.tasks-failed" tone="error" title="Tasks could not be loaded" text="Refresh the page in a moment." />
      )}
      {overdue.length > 0 && (
        <Alert id="alert.my-overdue" tone="warning" title={`${overdue.length} overdue ${department} tasks`} text="These are past their due date. They stay flagged until someone marks them done." />
      )}
      <Section id="section.my-tasks" title="Tasks" count={shown.length} subtitle="Soonest due first, across all new hires.">
        <Filters id="filters.my-tasks">
          <Field id="field.view" label="Show" type="select" options={["Open", "Done", "All"]} value={view} onChange={setView} />
        </Filters>
        <Table
          id="table.my-tasks"
          columns={["Task", "Hire", "Due date", "Claimed by", { label: "Status", kind: "status" }]}
          rows={shown.map((t) => ({
            id: `mytask.${t.id}`,
            cells: [t.title, t.hire, t.dueDate, t.claimedBy === "" ? "Nobody yet" : t.claimedBy],
            status: taskStatus(t, today),
            to: "screen.task-detail",
            params: { task: t.id },
            actions:
              t.status === "Done"
                ? [{ id: `mytask.${t.id}.reopen`, label: "Reopen", onPress: () => allTasks.update(t.id, { status: "To do", completedBy: "" }) }]
                : [
                    t.claimedBy === ""
                      ? { id: `mytask.${t.id}.claim`, label: "Claim", onPress: () => allTasks.update(t.id, { claimedBy: me }) }
                      : t.claimedBy === me
                        ? { id: `mytask.${t.id}.release`, label: "Release", onPress: () => allTasks.update(t.id, { claimedBy: "" }) }
                        : { id: `mytask.${t.id}.take`, label: "Claim", onPress: () => allTasks.update(t.id, { claimedBy: me }) },
                    { id: `mytask.${t.id}.done`, label: "Mark done", onPress: () => allTasks.update(t.id, { status: "Done", completedBy: me }) },
                  ],
          }))}
          empty={<EmptyState id="empty.my-tasks" title="No tasks to show" text="Tasks for new hires appear here." />}
        />
      </Section>
    </Shell>
  );
}

function TaskDetail() {
  const { task: id } = useParams();
  const role = useRole();
  const today = useToday();
  const navigate = useNav();
  const allTasks = useCollection<Task>("tasks");
  const department = departmentOf[role] ?? "IT";
  const me = people[role]?.name ?? "Sam Torres";
  const ofDepartment = allTasks.items.filter((t) => t.department === department);
  const task = (id ? allTasks.get(id) : undefined) ?? ofDepartment[0] ?? allTasks.items[0]!;
  const [note, setNote] = useState(task.note);
  return (
    <Shell>
      <Breadcrumbs
        id="crumbs.task"
        items={[
          { id: "crumb.my-tasks", label: "My tasks", to: "screen.my-tasks" },
          { id: "crumb.task", label: task.title },
        ]}
      />
      <Heading id="heading.task" text={`${task.title} for ${task.hire}`} />
      <Detail
        id="detail.task"
        fields={[
          { label: "Department", value: task.department },
          { label: "Due date", value: task.dueDate },
          { label: "Status", value: taskStatus(task, today).text },
          { label: "Claimed by", value: task.claimedBy === "" ? "Nobody yet" : task.claimedBy },
          { label: "Completed by", value: task.completedBy === "" ? "Not done yet" : task.completedBy },
        ]}
      />
      <Section id="section.task-actions" title="Actions">
        {task.status === "Done" ? (
          <Button id="btn.reopen" label="Reopen task" onPress={() => allTasks.update(task.id, { status: "To do", completedBy: "" })} />
        ) : (
          <>
            {task.claimedBy === me ? (
              <Button id="btn.release" label="Release task" onPress={() => allTasks.update(task.id, { claimedBy: "" })} />
            ) : (
              <Button id="btn.claim" label="Claim task" onPress={() => allTasks.update(task.id, { claimedBy: me })} />
            )}
            <Button
              id="btn.done"
              label="Mark done"
              emphasis="primary"
              onPress={() => {
                allTasks.update(task.id, { status: "Done", completedBy: me });
                navigate.go("screen.my-tasks");
              }}
            />
          </>
        )}
      </Section>
      <Form
        id="form.note"
        title="Note"
        onSubmit={() => allTasks.update(task.id, { note })}
        actions={<Button id="btn.save-note" label="Save note" submit />}
      >
        <Field id="field.note" label="Note, such as a serial number" type="textarea" value={note} onChange={setNote} />
      </Form>
    </Shell>
  );
}

function Account() {
  const role = useRole();
  const person = people[role] ?? { name: "Grace Liu", email: "grace.liu@acme.example" };
  return (
    <Shell>
      <Heading id="heading.account" text="Account" />
      <Detail id="detail.account" fields={[{ label: "Name", value: person.name }, { label: "Email", value: person.email }, { label: "Role", value: role }]} />
    </Shell>
  );
}

function SignedOut() {
  return (
    <Screen>
      <Heading id="heading.signed-out" text="You are signed out" />
      <Button id="btn.sign-in" label="Sign in" emphasis="primary" to="screen.account" />
    </Screen>
  );
}

export default defineApp({
  screens: {
    "screen.dashboard": Dashboard,
    "screen.plans": Plans,
    "screen.plan-new": PlanNew,
    "screen.plan-detail": PlanDetail,
    "screen.template": Template,
    "screen.overdue": Overdue,
    "screen.my-tasks": MyTasks,
    "screen.task-detail": TaskDetail,
    "screen.account": Account,
    "screen.signed-out": SignedOut,
  },
  data: { plans, tasks, templateTasks },
});
