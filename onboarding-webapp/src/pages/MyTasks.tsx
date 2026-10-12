import { useState, type ReactElement } from "react";
import { useNavigate } from "react-router-dom";
import { Alert, AlertTitle, Button, ListingTable, MenuItem, PageContent, PageTitle, Stack, TextField } from "@wso2/oxygen-ui";
import { onboardingApi } from "../api";
import { Can } from "../authz/gates";
import { LoadFailed, Loading, SectionHeader, taskStatusChip } from "../components/Common";
import type { components } from "../generated/onboarding-api";
import { fetchAll, messageOf, unwrap, useLoad } from "../lib/api-helpers";
import { refreshOverdueCounts } from "../lib/overdue";
import { useMe } from "../shell/Me";

type Task = components["schemas"]["Task"];
type View = "todo" | "done" | "all";

const VIEWS: readonly { value: View; label: string }[] = [
  { value: "todo", label: "Open" },
  { value: "done", label: "Done" },
  { value: "all", label: "All" },
];

/** Overdue tasks first, the most overdue at the top; the rest soonest due first. */
function mostOverdueFirst(list: Task[]): Task[] {
  return [...list].sort((a, b) => b.daysOverdue - a.daysOverdue || a.dueDate.localeCompare(b.dueDate));
}

export type TaskAction = "claim" | "release" | "complete" | "reopen";

/** Calls one of the task action operations and returns the updated task. */
export async function runTaskAction(action: TaskAction, taskId: string): Promise<Task> {
  const updated = await callTaskAction(action, taskId);
  refreshOverdueCounts();
  return updated;
}

async function callTaskAction(action: TaskAction, taskId: string): Promise<Task> {
  const params = { params: { path: { taskId } } };
  switch (action) {
    case "claim":
      return unwrap(await onboardingApi.POST("/me/department/tasks/{taskId}/claim", params));
    case "release":
      return unwrap(await onboardingApi.POST("/me/department/tasks/{taskId}/release", params));
    case "complete":
      return unwrap(await onboardingApi.POST("/me/department/tasks/{taskId}/complete", params));
    case "reopen":
      return unwrap(await onboardingApi.POST("/me/department/tasks/{taskId}/reopen", params));
  }
}

export function MyTasksPage(): ReactElement {
  const navigate = useNavigate();
  const { me } = useMe();
  const [view, setView] = useState<View>("todo");
  const [actionError, setActionError] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const [tasks, reload] = useLoad(
    () =>
      fetchAll(async (offset) =>
        unwrap(await onboardingApi.GET("/me/department/tasks", { params: { query: { status: view, limit: 100, offset } } })),
      ).then(mostOverdueFirst),
    [view],
  );

  const act = async (action: TaskAction, t: Task): Promise<void> => {
    setActionError("");
    setBusy(t.id);
    try {
      await runTaskAction(action, t.id);
      reload();
    } catch (err) {
      setActionError(messageOf(err));
    } finally {
      setBusy(null);
    }
  };

  const overdueCount = tasks.state === "ready" ? tasks.data.filter((t) => t.daysOverdue > 0).length : 0;
  const department = me?.department ?? "department";

  const heading = me?.department ? `${me.department} tasks` : "My department's tasks";

  return (
    <PageContent>
      <PageTitle>
        <PageTitle.Header>{heading}</PageTitle.Header>
      </PageTitle>
      <Stack spacing={2}>
        {overdueCount > 0 ? (
          <Alert severity="warning">
            <AlertTitle>{`${overdueCount} overdue ${department} tasks`}</AlertTitle>
            These are past their due date. They stay flagged until someone marks them done.
          </Alert>
        ) : null}
        <SectionHeader
          title="Tasks"
          count={tasks.state === "ready" ? tasks.data.length : undefined}
          subtitle="Overdue tasks first, then soonest due, across all new hires."
        />
        <Stack direction="row" spacing={2}>
          <TextField select size="small" label="Show" value={view} onChange={(e) => setView(e.target.value as View)} sx={{ minWidth: 160 }}>
            {VIEWS.map((v) => (
              <MenuItem key={v.value} value={v.value}>
                {v.label}
              </MenuItem>
            ))}
          </TextField>
        </Stack>
        {actionError ? <Alert severity="error">{actionError}</Alert> : null}
        {tasks.state === "loading" ? <Loading /> : null}
        {tasks.state === "failed" ? (
          <LoadFailed what="The tasks" message={tasks.message} onRetry={reload} />
        ) : null}
        {tasks.state === "ready" ? (
          <ListingTable.Container>
            <ListingTable>
              <ListingTable.Head>
                <ListingTable.Row>
                  <ListingTable.Cell>Task</ListingTable.Cell>
                  <ListingTable.Cell>Hire</ListingTable.Cell>
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
                      <ListingTable.EmptyState title="No tasks to show" description="Tasks for new hires appear here." />
                    </ListingTable.Cell>
                  </ListingTable.Row>
                ) : (
                  tasks.data.map((t) => (
                    <ListingTable.Row key={t.id} clickable hover selected={t.daysOverdue > 0} onClick={() => navigate(`/my-tasks/${t.id}`)}>
                      <ListingTable.Cell>{t.title}</ListingTable.Cell>
                      <ListingTable.Cell>{t.hireName}</ListingTable.Cell>
                      <ListingTable.Cell>{t.dueDate}</ListingTable.Cell>
                      <ListingTable.Cell>{t.claimedBy ?? "Nobody yet"}</ListingTable.Cell>
                      <ListingTable.Cell>{taskStatusChip(t)}</ListingTable.Cell>
                      <ListingTable.Cell align="right" onClick={(e) => e.stopPropagation()}>
                        <ListingTable.RowActions visibility="always" align="right">
                          {t.status === "done" ? (
                            <Can op="POST /me/department/tasks/{taskId}/reopen">
                              <Button size="small" variant="outlined" disabled={busy === t.id} onClick={() => void act("reopen", t)}>
                                Reopen
                              </Button>
                            </Can>
                          ) : (
                            <>
                              {t.claimedByMe ? (
                                <Can op="POST /me/department/tasks/{taskId}/release">
                                  <Button size="small" variant="outlined" disabled={busy === t.id} onClick={() => void act("release", t)}>
                                    Release
                                  </Button>
                                </Can>
                              ) : (
                                <Can op="POST /me/department/tasks/{taskId}/claim">
                                  <Button size="small" variant="outlined" disabled={busy === t.id} onClick={() => void act("claim", t)}>
                                    Claim
                                  </Button>
                                </Can>
                              )}
                              <Can op="POST /me/department/tasks/{taskId}/complete">
                                <Button size="small" variant="outlined" disabled={busy === t.id} onClick={() => void act("complete", t)}>
                                  Mark done
                                </Button>
                              </Can>
                            </>
                          )}
                        </ListingTable.RowActions>
                      </ListingTable.Cell>
                    </ListingTable.Row>
                  ))
                )}
              </ListingTable.Body>
            </ListingTable>
          </ListingTable.Container>
        ) : null}
      </Stack>
    </PageContent>
  );
}
