import type { ReactElement } from "react";
import { useNavigate } from "react-router-dom";
import { Button, ListingTable, PageContent, PageTitle } from "@wso2/oxygen-ui";
import { onboardingApi } from "../api";
import { Can } from "../authz/gates";
import { LoadFailed, Loading, SectionHeader, planStatusChip } from "../components/Common";
import { fetchAll, unwrap, useLoad } from "../lib/api-helpers";

export function PlansPage(): ReactElement {
  const navigate = useNavigate();
  const [plans, reload] = useLoad(
    () =>
      fetchAll(async (offset) =>
        unwrap(
          await onboardingApi.GET("/plans", {
            params: { query: { includeClosed: true, sort: "startDate", limit: 100, offset } },
          }),
        ),
      ),
    [],
  );

  return (
    <PageContent>
      <PageTitle>
        <PageTitle.Header>Onboarding plans</PageTitle.Header>
      </PageTitle>
      <SectionHeader
        title="All plans"
        count={plans.state === "ready" ? plans.data.length : undefined}
        subtitle="One plan per new hire, including cancelled ones."
        actions={
          <Can op="POST /plans">
            <Button variant="contained" onClick={() => navigate("/plans/new")}>
              New plan
            </Button>
          </Can>
        }
      />
      {plans.state === "loading" ? <Loading /> : null}
      {plans.state === "failed" ? <LoadFailed what="The plans" message={plans.message} onRetry={reload} /> : null}
      {plans.state === "ready" ? (
        <ListingTable.Container>
          <ListingTable>
            <ListingTable.Head>
              <ListingTable.Row>
                <ListingTable.Cell>Hire</ListingTable.Cell>
                <ListingTable.Cell>Role</ListingTable.Cell>
                <ListingTable.Cell>Department</ListingTable.Cell>
                <ListingTable.Cell>Start date</ListingTable.Cell>
                <ListingTable.Cell>Manager</ListingTable.Cell>
                <ListingTable.Cell>Plan</ListingTable.Cell>
              </ListingTable.Row>
            </ListingTable.Head>
            <ListingTable.Body>
              {plans.data.length === 0 ? (
                <ListingTable.Row>
                  <ListingTable.Cell colSpan={6}>
                    <ListingTable.EmptyState
                      title="No onboarding plans yet"
                      description="Create a plan when a new hire is confirmed."
                    />
                  </ListingTable.Cell>
                </ListingTable.Row>
              ) : (
                plans.data.map((p) => (
                  <ListingTable.Row key={p.id} clickable hover onClick={() => navigate(`/plans/${encodeURIComponent(p.id)}`)}>
                    <ListingTable.Cell>{p.hireName}</ListingTable.Cell>
                    <ListingTable.Cell>{p.jobTitle}</ListingTable.Cell>
                    <ListingTable.Cell>{p.department}</ListingTable.Cell>
                    <ListingTable.Cell>{p.startDate}</ListingTable.Cell>
                    <ListingTable.Cell>{p.managerName}</ListingTable.Cell>
                    <ListingTable.Cell>{planStatusChip(p.status)}</ListingTable.Cell>
                  </ListingTable.Row>
                ))
              )}
            </ListingTable.Body>
          </ListingTable>
        </ListingTable.Container>
      ) : null}
    </PageContent>
  );
}
