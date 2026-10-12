import { useState, type FormEvent, type ReactElement } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Alert,
  AlertTitle,
  AppBreadcrumbs,
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  ListingTable,
  PageContent,
  PageTitle,
  Stack,
  TextField,
  Typography,
} from "@wso2/oxygen-ui";
import { onboardingApi } from "../api";
import { Can } from "../authz/gates";
import { LoadFailed, Loading, SectionHeader, planStatusChip } from "../components/Common";
import { TaskDialog, type TaskValues } from "../components/TaskDialog";
import type { components } from "../generated/onboarding-api";
import { ApiProblem, ensureOk, fetchAll, messageOf, unwrap, useLoad } from "../lib/api-helpers";

type Task = components["schemas"]["Task"];

function taskStatusChip(t: Task): ReactElement {
  if (t.status === "done") return <Chip size="small" color="success" label="Done" />;
  if (t.daysOverdue > 0) return <Chip size="small" color="error" label={`${t.daysOverdue} days overdue`} />;
  return <Chip size="small" variant="outlined" label="To do" />;
}

export function PlanDetailPage(): ReactElement {
  const { plan: planId = "" } = useParams();
  const navigate = useNavigate();

  const [plan, reloadPlan] = useLoad(
    async () => unwrap(await onboardingApi.GET("/plans/{planId}", { params: { path: { planId } } })),
    [planId],
  );
  const [tasks, reloadTasks] = useLoad(
    () =>
      fetchAll(async (offset) =>
        unwrap(
          await onboardingApi.GET("/plans/{planId}/tasks", {
            params: { path: { planId }, query: { limit: 100, offset } },
          }),
        ),
      ),
    [planId],
  );

  // null: closed; "new": adding; a Task: editing it.
  const [editing, setEditing] = useState<Task | "new" | null>(null);
  const [startOpen, setStartOpen] = useState(false);
  const [newStart, setNewStart] = useState("");
  const [startError, setStartError] = useState("");
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelError, setCancelError] = useState("");
  const [actionError, setActionError] = useState("");

  if (plan.state === "loading") {
    return (
      <PageContent>
        <Loading />
      </PageContent>
    );
  }
  if (plan.state === "failed") {
    const notFound = plan.status === 404;
    return (
      <PageContent>
        <AppBreadcrumbs items={[{ key: "plans", label: "Onboarding plans", onClick: () => navigate("/plans") }]} />
        <PageTitle>
          <PageTitle.Header>{notFound ? "Plan not found" : "Onboarding plan"}</PageTitle.Header>
        </PageTitle>
        {notFound ? (
          <Alert severity="warning">
            <AlertTitle>No such onboarding plan</AlertTitle>
            It may have been removed, or the link is wrong. Go back to the plans list to find it.
          </Alert>
        ) : (
          <LoadFailed what="The plan" message={plan.message} onRetry={reloadPlan} />
        )}
      </PageContent>
    );
  }

  const p = plan.data;
  const active = p.status === "active";

  const openEdit = (t: Task): TaskValues => ({ title: t.title, department: t.department, dueOffsetDays: t.dueOffsetDays });

  const saveTask = async (values: TaskValues): Promise<void> => {
    if (editing === "new") {
      unwrap(await onboardingApi.POST("/plans/{planId}/tasks", { params: { path: { planId } }, body: values }));
    } else if (editing) {
      unwrap(
        await onboardingApi.PUT("/plans/{planId}/tasks/{taskId}", {
          params: { path: { planId, taskId: editing.id } },
          body: values,
        }),
      );
    }
    setEditing(null);
    reloadTasks();
    reloadPlan();
  };

  const removeTask = async (t: Task): Promise<void> => {
    setActionError("");
    try {
      ensureOk(await onboardingApi.DELETE("/plans/{planId}/tasks/{taskId}", { params: { path: { planId, taskId: t.id } } }));
      reloadTasks();
      reloadPlan();
    } catch (err) {
      setActionError(messageOf(err));
    }
  };

  const saveStart = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    if (newStart === "") {
      setStartError("Choose a start date");
      return;
    }
    try {
      unwrap(await onboardingApi.PATCH("/plans/{planId}", { params: { path: { planId } }, body: { startDate: newStart } }));
      setStartOpen(false);
      reloadPlan();
      reloadTasks();
    } catch (err) {
      setStartError(messageOf(err));
    }
  };

  const confirmCancel = async (): Promise<void> => {
    try {
      unwrap(await onboardingApi.POST("/plans/{planId}/cancel", { params: { path: { planId } } }));
      setCancelOpen(false);
      navigate("/plans");
    } catch (err) {
      setCancelError(err instanceof ApiProblem ? err.message : messageOf(err));
    }
  };

  const fields = [
    { label: "Role", value: p.jobTitle },
    { label: "Department", value: p.department },
    { label: "Manager", value: p.managerName },
    { label: "Start date", value: p.startDate },
  ];

  return (
    <PageContent>
      <AppBreadcrumbs
        items={[
          { key: "plans", label: "Onboarding plans", onClick: () => navigate("/plans") },
          { key: "plan", label: p.hireName },
        ]}
      />
      <PageTitle>
        <PageTitle.Header>{p.hireName}</PageTitle.Header>
        {active ? (
          <PageTitle.Actions>
            <Can op="PATCH /plans/{planId}">
              <Button
                variant="outlined"
                onClick={() => {
                  setNewStart(p.startDate);
                  setStartError("");
                  setStartOpen(true);
                }}
              >
                Change start date
              </Button>
            </Can>
            <Can op="POST /plans/{planId}/cancel">
              <Button
                variant="contained"
                color="error"
                onClick={() => {
                  setCancelError("");
                  setCancelOpen(true);
                }}
              >
                Cancel plan
              </Button>
            </Can>
          </PageTitle.Actions>
        ) : null}
      </PageTitle>

      <Stack spacing={3}>
        {!active ? (
          <Alert severity="warning">
            <AlertTitle>This plan is cancelled</AlertTitle>
            Its tasks no longer appear in task lists or reminders.
          </Alert>
        ) : null}

        <Card variant="outlined">
          <CardHeader title="Plan details" />
          <CardContent>
            <Grid container spacing={2}>
              {fields.map((f) => (
                <Grid key={f.label} size={{ xs: 12, md: 4 }}>
                  <Typography variant="overline" color="text.secondary">
                    {f.label}
                  </Typography>
                  <Typography variant="body2">{f.value}</Typography>
                </Grid>
              ))}
              <Grid size={{ xs: 12, md: 4 }}>
                <Typography variant="overline" color="text.secondary">
                  Plan
                </Typography>
                <Box>{planStatusChip(p.status)}</Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        <Box>
          <SectionHeader
            title="Tasks"
            count={tasks.state === "ready" ? tasks.data.length : undefined}
            subtitle="Due dates follow the start date."
            actions={
              active ? (
                <Can op="POST /plans/{planId}/tasks">
                  <Button variant="contained" onClick={() => setEditing("new")}>
                    Add task
                  </Button>
                </Can>
              ) : undefined
            }
          />
          {actionError ? (
            <Alert severity="error" sx={{ mb: 2 }}>
              {actionError}
            </Alert>
          ) : null}
          {tasks.state === "loading" ? <Loading /> : null}
          {tasks.state === "failed" ? <LoadFailed what="The tasks" message={tasks.message} onRetry={reloadTasks} /> : null}
          {tasks.state === "ready" ? (
            <ListingTable.Container>
              <ListingTable>
                <ListingTable.Head>
                  <ListingTable.Row>
                    <ListingTable.Cell>Task</ListingTable.Cell>
                    <ListingTable.Cell>Department</ListingTable.Cell>
                    <ListingTable.Cell>Due date</ListingTable.Cell>
                    <ListingTable.Cell>Claimed by</ListingTable.Cell>
                    <ListingTable.Cell>Status</ListingTable.Cell>
                    <ListingTable.Cell />
                  </ListingTable.Row>
                </ListingTable.Head>
                <ListingTable.Body>
                  {tasks.data.length === 0 ? (
                    <ListingTable.Row>
                      <ListingTable.Cell colSpan={6}>
                        <ListingTable.EmptyState
                          title="No tasks in this plan"
                          description="Add a task or start from the template."
                        />
                      </ListingTable.Cell>
                    </ListingTable.Row>
                  ) : (
                    tasks.data.map((t) => (
                      <ListingTable.Row key={t.id}>
                        <ListingTable.Cell>{t.title}</ListingTable.Cell>
                        <ListingTable.Cell>{t.department}</ListingTable.Cell>
                        <ListingTable.Cell>{t.dueDate}</ListingTable.Cell>
                        <ListingTable.Cell>{t.claimedBy ?? "Nobody yet"}</ListingTable.Cell>
                        <ListingTable.Cell>{taskStatusChip(t)}</ListingTable.Cell>
                        <ListingTable.Cell align="right">
                          {active ? (
                            <ListingTable.RowActions visibility="always" align="right">
                              <Can op="PUT /plans/{planId}/tasks/{taskId}">
                                <Button size="small" variant="text" onClick={() => setEditing(t)}>
                                  Edit
                                </Button>
                              </Can>
                              <Can op="DELETE /plans/{planId}/tasks/{taskId}">
                                <Button size="small" variant="text" color="error" onClick={() => void removeTask(t)}>
                                  Remove
                                </Button>
                              </Can>
                            </ListingTable.RowActions>
                          ) : null}
                        </ListingTable.Cell>
                      </ListingTable.Row>
                    ))
                  )}
                </ListingTable.Body>
              </ListingTable>
            </ListingTable.Container>
          ) : null}
        </Box>
      </Stack>

      <TaskDialog
        open={editing !== null}
        heading={editing === "new" ? "Add task" : "Edit task"}
        initial={editing && editing !== "new" ? openEdit(editing) : null}
        onClose={() => setEditing(null)}
        onSave={saveTask}
      />

      <Dialog open={startOpen} onClose={() => setStartOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Change start date</DialogTitle>
        <Box component="form" onSubmit={(e: FormEvent) => void saveStart(e)} noValidate>
          <DialogContent>
            <Stack spacing={2} sx={{ pt: 1 }}>
              {startError ? <Alert severity="error">{startError}</Alert> : null}
              <TextField
                label="New start date"
                type="date"
                required
                value={newStart}
                onChange={(e) => setNewStart(e.target.value)}
                slotProps={{ inputLabel: { shrink: true } }}
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button variant="outlined" onClick={() => setStartOpen(false)}>
              Close
            </Button>
            <Button variant="contained" type="submit">
              Save start date
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      <Dialog open={cancelOpen} onClose={() => setCancelOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>{`Cancel the plan for ${p.hireName}?`}</DialogTitle>
        <DialogContent>
          <Stack spacing={2}>
            {cancelError ? <Alert severity="error">{cancelError}</Alert> : null}
            <Typography variant="body2">
              The plan stays in the list, and its tasks disappear from task lists and reminders.
            </Typography>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button variant="outlined" onClick={() => setCancelOpen(false)}>
            Keep plan
          </Button>
          <Button variant="contained" color="error" onClick={() => void confirmCancel()}>
            Cancel plan
          </Button>
        </DialogActions>
      </Dialog>
    </PageContent>
  );
}
