import { useState, type ReactElement } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, Chip, Grid, ListingTable, MenuItem, PageContent, PageTitle, Stack, TextField, Typography } from "@wso2/oxygen-ui";
import { Clock, TriangleAlert, Users } from "@wso2/oxygen-ui-icons-react";
import { onboardingApi } from "../api";
import { LoadFailed, Loading, SectionHeader } from "../components/Common";
import { fetchAll, unwrap, useLoad } from "../lib/api-helpers";
import type { components } from "../generated/onboarding-api";

type PlanSummary = components["schemas"]["PlanSummary"];

function progressStatus(s: PlanSummary): ReactElement {
  if (s.status === "cancelled") return <Chip size="small" variant="outlined" label="Cancelled" />;
  if (s.complete) return <Chip size="small" color="success" label="Complete" />;
  if (s.overdueTasks > 0) return <Chip size="small" color="error" label={`${s.overdueTasks} overdue`} />;
  return <Chip size="small" color="info" label="On track" />;
}

function StatTile({ label, value, hint, icon, color }: { label: string; value: number; hint: string; icon: ReactElement; color: string }): ReactElement {
  return (
    <Card variant="outlined">
      <CardContent>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ color }}>
          {icon}
          <Typography variant="overline">{label}</Typography>
        </Stack>
        <Typography variant="h4">{value}</Typography>
        <Typography variant="caption" color="text.secondary">
          {hint}
        </Typography>
      </CardContent>
    </Card>
  );
}

export function DashboardPage(): ReactElement {
  const navigate = useNavigate();
  const [showAll, setShowAll] = useState("No");
  const [sort, setSort] = useState("Start date");
  const includeClosed = showAll === "Yes";
  const sortKey = sort === "Overdue tasks" ? "overdueTasks" : "startDate";

  const load = (closed: boolean, order: "startDate" | "overdueTasks") => () =>
    fetchAll(async (offset) =>
      unwrap(
        await onboardingApi.GET("/plans", {
          params: { query: { includeClosed: closed, sort: order, limit: 100, offset } },
        }),
      ),
    );
  // The tiles always count active plans, whatever the table shows.
  const [active, reloadActive] = useLoad(load(false, "startDate"), []);
  const [rows, reloadRows] = useLoad(load(includeClosed, sortKey), [includeClosed, sortKey]);
  const reload = (): void => {
    reloadActive();
    reloadRows();
  };

  const activeList = active.state === "ready" ? active.data : [];
  const tiles = active.state === "ready";

  return (
    <PageContent>
      <PageTitle>
        <PageTitle.Header>Progress dashboard</PageTitle.Header>
      </PageTitle>
      <Stack spacing={3}>
        {active.state === "failed" || rows.state === "failed" ? (
          <LoadFailed what="Progress" message="Refresh the page in a moment." onRetry={reload} />
        ) : null}
        {active.state === "loading" ? <Loading /> : null}
        {tiles ? (
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 4 }}>
              <StatTile label="Hires onboarding" value={activeList.length} hint="active plans in progress" icon={<Users size={18} />} color="primary.main" />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <StatTile
                label="Hires with overdue tasks"
                value={activeList.filter((s) => s.overdueTasks > 0).length}
                hint="need a nudge"
                icon={<TriangleAlert size={18} />}
                color="error.main"
              />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <StatTile
                label="Overdue tasks"
                value={activeList.reduce((sum, s) => sum + s.overdueTasks, 0)}
                hint="across all departments"
                icon={<Clock size={18} />}
                color="warning.main"
              />
            </Grid>
          </Grid>
        ) : null}
        <SectionHeader
          title="New hires"
          count={rows.state === "ready" ? rows.data.length : undefined}
          subtitle="Open a hire to see their plan and tasks."
        />
        <ListingTable.Container>
          <ListingTable.Toolbar>
            <TextField select size="small" label="Include completed and cancelled plans" value={showAll} onChange={(e) => setShowAll(e.target.value)} sx={{ minWidth: 280 }}>
              <MenuItem value="No">No</MenuItem>
              <MenuItem value="Yes">Yes</MenuItem>
            </TextField>
            <TextField select size="small" label="Sort by" value={sort} onChange={(e) => setSort(e.target.value)} sx={{ minWidth: 180 }}>
              <MenuItem value="Start date">Start date</MenuItem>
              <MenuItem value="Overdue tasks">Overdue tasks</MenuItem>
            </TextField>
          </ListingTable.Toolbar>
          {rows.state === "loading" ? <Loading /> : null}
          {rows.state === "ready" ? (
            <ListingTable>
              <ListingTable.Head>
                <ListingTable.Row>
                  <ListingTable.Cell>Hire</ListingTable.Cell>
                  <ListingTable.Cell>Start date</ListingTable.Cell>
                  <ListingTable.Cell>Progress</ListingTable.Cell>
                  <ListingTable.Cell>Outstanding: IT / HR / Facilities</ListingTable.Cell>
                  <ListingTable.Cell>Status</ListingTable.Cell>
                </ListingTable.Row>
              </ListingTable.Head>
              <ListingTable.Body>
                {rows.data.length === 0 ? (
                  <ListingTable.Row>
                    <ListingTable.Cell colSpan={5}>
                      <ListingTable.EmptyState title="No hires to show" description="Active onboarding plans appear here." />
                    </ListingTable.Cell>
                  </ListingTable.Row>
                ) : (
                  rows.data.map((s) => (
                    <ListingTable.Row key={s.id} clickable hover onClick={() => navigate(`/plans/${encodeURIComponent(s.id)}`)}>
                      <ListingTable.Cell>{s.hireName}</ListingTable.Cell>
                      <ListingTable.Cell>{s.startDate}</ListingTable.Cell>
                      <ListingTable.Cell>{`${s.doneTasks} of ${s.totalTasks} done`}</ListingTable.Cell>
                      <ListingTable.Cell>{`${s.outstandingByDepartment.IT} / ${s.outstandingByDepartment.HR} / ${s.outstandingByDepartment.Facilities}`}</ListingTable.Cell>
                      <ListingTable.Cell>{progressStatus(s)}</ListingTable.Cell>
                    </ListingTable.Row>
                  ))
                )}
              </ListingTable.Body>
            </ListingTable>
          ) : null}
        </ListingTable.Container>
      </Stack>
    </PageContent>
  );
}
