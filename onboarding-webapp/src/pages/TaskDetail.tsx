import { useEffect, useState, type FormEvent, type ReactElement } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Alert, AlertTitle, AppBreadcrumbs, Box, Button, Card, CardContent, CardHeader, Grid, PageContent, PageTitle, Stack, TextField, Typography } from "@wso2/oxygen-ui";
import { onboardingApi } from "../api";
import { Can } from "../authz/gates";
import { LoadFailed, Loading, taskStatusChip } from "../components/Common";
import { ApiProblem, messageOf, unwrap, useLoad } from "../lib/api-helpers";
import { runTaskAction, type TaskAction } from "./MyTasks";

export function TaskDetailPage(): ReactElement {
  const { task: taskId = "" } = useParams();
  const navigate = useNavigate();
  const [task, reload] = useLoad(
    async () => unwrap(await onboardingApi.GET("/me/department/tasks/{taskId}", { params: { path: { taskId } } })),
    [taskId],
  );
  const [note, setNote] = useState("");
  const [noteError, setNoteError] = useState("");
  const [noteSaved, setNoteSaved] = useState(false);
  const [actionError, setActionError] = useState("");
  const [busy, setBusy] = useState(false);

  const loadedNote = task.state === "ready" ? (task.data.note ?? "") : "";
  useEffect(() => {
    setNote(loadedNote);
  }, [loadedNote, taskId]);

  const crumbs = (label: string): ReactElement => (
    <AppBreadcrumbs
      items={[{ key: "my-tasks", label: "My tasks", onClick: () => navigate("/my-tasks") }, { key: "task", label }]}
    />
  );

  if (task.state === "loading") {
    return (
      <PageContent>
        <Loading />
      </PageContent>
    );
  }
  if (task.state === "failed") {
    const notFound = task.status === 404;
    return (
      <PageContent>
        {crumbs("Task")}
        <PageTitle>
          <PageTitle.Header>{notFound ? "Task not found" : "Task"}</PageTitle.Header>
        </PageTitle>
        {notFound ? (
          <Alert severity="warning">
            <AlertTitle>No such task</AlertTitle>
            It may belong to another department, or the link is wrong. Go back to your tasks to find it.
          </Alert>
        ) : (
          <LoadFailed what="The task" message={task.message} onRetry={reload} />
        )}
      </PageContent>
    );
  }

  const t = task.data;

  const act = async (action: TaskAction): Promise<void> => {
    setActionError("");
    setBusy(true);
    try {
      await runTaskAction(action, t.id);
      if (action === "complete") navigate("/my-tasks");
      else reload();
    } catch (err) {
      setActionError(messageOf(err));
    } finally {
      setBusy(false);
    }
  };

  const saveNote = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    setNoteError("");
    setNoteSaved(false);
    try {
      unwrap(
        await onboardingApi.PUT("/me/department/tasks/{taskId}/note", {
          params: { path: { taskId: t.id } },
          body: { note },
        }),
      );
      setNoteSaved(true);
      reload();
    } catch (err) {
      setNoteError(err instanceof ApiProblem ? err.message : messageOf(err));
    }
  };

  const fields: { label: string; value: ReactElement | string }[] = [
    { label: "Department", value: t.department },
    { label: "Due date", value: t.dueDate },
    { label: "Status", value: taskStatusChip(t) },
    { label: "Claimed by", value: t.claimedBy ?? "Nobody yet" },
    {
      label: "Completed by",
      value: t.completedBy ? `${t.completedBy}${t.completedAt ? `, ${new Date(t.completedAt).toLocaleString()}` : ""}` : "Not done yet",
    },
  ];

  return (
    <PageContent>
      {crumbs(t.title)}
      <PageTitle>
        <PageTitle.Header>{`${t.title} for ${t.hireName}`}</PageTitle.Header>
      </PageTitle>
      <Stack spacing={3}>
        <Card variant="outlined">
          <CardHeader title="Details" />
          <CardContent>
            <Grid container spacing={2}>
              {fields.map((f) => (
                <Grid key={f.label} size={{ xs: 12, md: 4 }}>
                  <Typography variant="overline" color="text.secondary">
                    {f.label}
                  </Typography>
                  <Box>{typeof f.value === "string" ? <Typography variant="body2">{f.value}</Typography> : f.value}</Box>
                </Grid>
              ))}
            </Grid>
          </CardContent>
        </Card>

        <Card variant="outlined">
          <CardHeader title="Actions" />
          <CardContent>
            <Stack spacing={2}>
              {actionError ? <Alert severity="error">{actionError}</Alert> : null}
              <Stack direction="row" spacing={1}>
                {t.status === "done" ? (
                  <Can op="POST /me/department/tasks/{taskId}/reopen">
                    <Button variant="outlined" disabled={busy} onClick={() => void act("reopen")}>
                      Reopen task
                    </Button>
                  </Can>
                ) : (
                  <>
                    {t.claimedByMe ? (
                      <Can op="POST /me/department/tasks/{taskId}/release">
                        <Button variant="outlined" disabled={busy} onClick={() => void act("release")}>
                          Release task
                        </Button>
                      </Can>
                    ) : (
                      <Can op="POST /me/department/tasks/{taskId}/claim">
                        <Button variant="outlined" disabled={busy} onClick={() => void act("claim")}>
                          Claim task
                        </Button>
                      </Can>
                    )}
                    <Can op="POST /me/department/tasks/{taskId}/complete">
                      <Button variant="contained" disabled={busy} onClick={() => void act("complete")}>
                        Mark done
                      </Button>
                    </Can>
                  </>
                )}
              </Stack>
            </Stack>
          </CardContent>
        </Card>

        <Can op="PUT /me/department/tasks/{taskId}/note">
          <Card variant="outlined">
            <CardHeader title="Note" />
            <CardContent>
              <Box component="form" onSubmit={(e: FormEvent) => void saveNote(e)} noValidate>
                <Stack spacing={2}>
                  {noteError ? <Alert severity="error">{noteError}</Alert> : null}
                  {noteSaved ? <Alert severity="success">Note saved.</Alert> : null}
                  <TextField
                    label="Note, such as a serial number"
                    multiline
                    minRows={3}
                    value={note}
                    onChange={(e) => {
                      setNote(e.target.value);
                      setNoteSaved(false);
                    }}
                  />
                  <Box>
                    <Button type="submit" variant="contained">
                      Save note
                    </Button>
                  </Box>
                </Stack>
              </Box>
            </CardContent>
          </Card>
        </Can>
      </Stack>
    </PageContent>
  );
}
