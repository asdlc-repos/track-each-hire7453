import type { ReactElement } from "react";
import { useNavigate } from "react-router-dom";
import { Alert, AlertTitle, ListingTable, PageContent, PageTitle, Stack } from "@wso2/oxygen-ui";
import { onboardingApi } from "../api";
import { LoadFailed, Loading, SectionHeader } from "../components/Common";
import { fetchAll, unwrap, useLoad } from "../lib/api-helpers";

export function OverduePage(): ReactElement {
  const navigate = useNavigate();
  const [tasks, reload] = useLoad(
    () =>
      fetchAll(async (offset) =>
        unwrap(await onboardingApi.GET("/tasks", { params: { query: { overdue: true, limit: 100, offset } } })),
      ).then((list) => [...list].sort((a, b) => b.daysOverdue - a.daysOverdue || a.dueDate.localeCompare(b.dueDate))),
    [],
  );

  return (
    <PageContent>
      <PageTitle>
        <PageTitle.Header>Overdue tasks</PageTitle.Header>
      </PageTitle>
      <Stack spacing={2}>
        {tasks.state === "loading" ? <Loading /> : null}
        {tasks.state === "failed" ? <LoadFailed what="Overdue tasks" message={tasks.message} onRetry={reload} /> : null}
        {tasks.state === "ready" && tasks.data.length > 0 ? (
          <Alert severity="warning">
            <AlertTitle>{`${tasks.data.length} tasks are overdue`}</AlertTitle>
            They stay here until the owning team marks them done.
          </Alert>
        ) : null}
        {tasks.state === "ready" ? (
          <>
            <SectionHeader title="Overdue" count={tasks.data.length} subtitle="Most overdue first, across all hires." />
            <ListingTable.Container>
              <ListingTable>
                <ListingTable.Head>
                  <ListingTable.Row>
                    <ListingTable.Cell>Hire</ListingTable.Cell>
                    <ListingTable.Cell>Task</ListingTable.Cell>
                    <ListingTable.Cell>Department</ListingTable.Cell>
                    <ListingTable.Cell>Due date</ListingTable.Cell>
                    <ListingTable.Cell align="right">Days overdue</ListingTable.Cell>
                    <ListingTable.Cell>Claimed by</ListingTable.Cell>
                  </ListingTable.Row>
                </ListingTable.Head>
                <ListingTable.Body>
                  {tasks.data.length === 0 ? (
                    <ListingTable.Row>
                      <ListingTable.Cell colSpan={6}>
                        <ListingTable.EmptyState
                          title="Nothing is overdue"
                          description="Overdue tasks appear here the day after their due date."
                        />
                      </ListingTable.Cell>
                    </ListingTable.Row>
                  ) : (
                    tasks.data.map((t) => (
                      <ListingTable.Row key={t.id} clickable hover onClick={() => navigate(`/plans/${t.planId}`)}>
                        <ListingTable.Cell>{t.hireName}</ListingTable.Cell>
                        <ListingTable.Cell>{t.title}</ListingTable.Cell>
                        <ListingTable.Cell>{t.department}</ListingTable.Cell>
                        <ListingTable.Cell>{t.dueDate}</ListingTable.Cell>
                        <ListingTable.Cell align="right">{t.daysOverdue}</ListingTable.Cell>
                        <ListingTable.Cell>{t.claimedBy ?? "Nobody yet"}</ListingTable.Cell>
                      </ListingTable.Row>
                    ))
                  )}
                </ListingTable.Body>
              </ListingTable>
            </ListingTable.Container>
          </>
        ) : null}
      </Stack>
    </PageContent>
  );
}
