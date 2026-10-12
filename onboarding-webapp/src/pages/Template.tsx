import { useState, type ReactElement } from "react";
import { Alert, Box, Button, ListingTable, PageContent, PageTitle } from "@wso2/oxygen-ui";
import { onboardingApi } from "../api";
import { Can } from "../authz/gates";
import { LoadFailed, Loading, SectionHeader } from "../components/Common";
import { TaskDialog, type TaskValues } from "../components/TaskDialog";
import type { components } from "../generated/onboarding-api";
import { ensureOk, fetchAll, messageOf, offsetText, unwrap, useLoad } from "../lib/api-helpers";

type TemplateTask = components["schemas"]["TemplateTask"];

export function TemplatePage(): ReactElement {
  const [tasks, reload] = useLoad(
    () =>
      fetchAll(async (offset) =>
        unwrap(await onboardingApi.GET("/template-tasks", { params: { query: { limit: 100, offset } } })),
      ),
    [],
  );
  const [editing, setEditing] = useState<TemplateTask | "new" | null>(null);
  const [actionError, setActionError] = useState("");

  const save = async (values: TaskValues): Promise<void> => {
    if (editing === "new") {
      unwrap(await onboardingApi.POST("/template-tasks", { body: values }));
    } else if (editing) {
      unwrap(
        await onboardingApi.PUT("/template-tasks/{templateTaskId}", {
          params: { path: { templateTaskId: editing.id } },
          body: values,
        }),
      );
    }
    setEditing(null);
    reload();
  };

  const remove = async (t: TemplateTask): Promise<void> => {
    setActionError("");
    try {
      ensureOk(await onboardingApi.DELETE("/template-tasks/{templateTaskId}", { params: { path: { templateTaskId: t.id } } }));
      reload();
    } catch (err) {
      setActionError(messageOf(err));
    }
  };

  return (
    <PageContent>
      <PageTitle>
        <PageTitle.Header>Checklist template</PageTitle.Header>
      </PageTitle>
      <Alert severity="info" sx={{ mb: 3 }}>
        Changes apply to plans created from now on. Existing plans keep the tasks they were created with.
      </Alert>
      <Box>
        <SectionHeader
          title="Standard checklist"
          count={tasks.state === "ready" ? tasks.data.length : undefined}
          subtitle="Copied into every new onboarding plan."
          actions={
            <Can op="POST /template-tasks">
              <Button variant="contained" onClick={() => setEditing("new")}>
                Add task
              </Button>
            </Can>
          }
        />
        {actionError ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            {actionError}
          </Alert>
        ) : null}
        {tasks.state === "loading" ? <Loading /> : null}
        {tasks.state === "failed" ? <LoadFailed what="The checklist" message={tasks.message} onRetry={reload} /> : null}
        {tasks.state === "ready" ? (
          <ListingTable.Container>
            <ListingTable>
              <ListingTable.Head>
                <ListingTable.Row>
                  <ListingTable.Cell>Task</ListingTable.Cell>
                  <ListingTable.Cell>Department</ListingTable.Cell>
                  <ListingTable.Cell>Due</ListingTable.Cell>
                  <ListingTable.Cell />
                </ListingTable.Row>
              </ListingTable.Head>
              <ListingTable.Body>
                {tasks.data.length === 0 ? (
                  <ListingTable.Row>
                    <ListingTable.Cell colSpan={4}>
                      <ListingTable.EmptyState
                        title="The checklist is empty"
                        description="Add the tasks every new hire needs."
                      />
                    </ListingTable.Cell>
                  </ListingTable.Row>
                ) : (
                  tasks.data.map((t) => (
                    <ListingTable.Row key={t.id}>
                      <ListingTable.Cell>{t.title}</ListingTable.Cell>
                      <ListingTable.Cell>{t.department}</ListingTable.Cell>
                      <ListingTable.Cell>{offsetText(t.dueOffsetDays)}</ListingTable.Cell>
                      <ListingTable.Cell align="right">
                        <ListingTable.RowActions visibility="always" align="right">
                          <Can op="PUT /template-tasks/{templateTaskId}">
                            <Button size="small" variant="text" onClick={() => setEditing(t)}>
                              Edit
                            </Button>
                          </Can>
                          <Can op="DELETE /template-tasks/{templateTaskId}">
                            <Button size="small" variant="text" color="error" onClick={() => void remove(t)}>
                              Remove
                            </Button>
                          </Can>
                        </ListingTable.RowActions>
                      </ListingTable.Cell>
                    </ListingTable.Row>
                  ))
                )}
              </ListingTable.Body>
            </ListingTable>
          </ListingTable.Container>
        ) : null}
      </Box>
      <TaskDialog
        open={editing !== null}
        heading={editing === "new" ? "Add template task" : "Edit template task"}
        initial={
          editing && editing !== "new"
            ? { title: editing.title, department: editing.department, dueOffsetDays: editing.dueOffsetDays }
            : null
        }
        onClose={() => setEditing(null)}
        onSave={save}
      />
    </PageContent>
  );
}
