import { useState, type FormEvent, type ReactElement } from "react";
import { useNavigate } from "react-router-dom";
import { Alert, AlertTitle, AppBreadcrumbs, Box, Button, Card, CardContent, CardHeader, PageContent, PageTitle, Stack, TextField } from "@wso2/oxygen-ui";
import { onboardingApi } from "../api";
import { Can } from "../authz/gates";
import { messageOf, unwrap, useLoad } from "../lib/api-helpers";

interface Values {
  hireName: string;
  jobTitle: string;
  department: string;
  startDate: string;
  managerName: string;
}

const EMPTY: Values = { hireName: "", jobTitle: "", department: "", startDate: "", managerName: "" };

const REQUIRED: { key: keyof Values; issue: string }[] = [
  { key: "hireName", issue: "Enter the hire's name" },
  { key: "jobTitle", issue: "Enter the hire's role" },
  { key: "department", issue: "Enter the hire's department" },
  { key: "startDate", issue: "Choose a start date" },
  { key: "managerName", issue: "Enter the hire's manager" },
];

export function PlanNewPage(): ReactElement {
  const navigate = useNavigate();
  const [values, setValues] = useState<Values>(EMPTY);
  const [issues, setIssues] = useState<{ key: keyof Values | "server"; issue: string }[]>([]);
  const [saving, setSaving] = useState(false);

  // The count of tasks the plan will start with. Only informs the note; a
  // failed read must not block creating a plan.
  const [template] = useLoad(
    async () => unwrap(await onboardingApi.GET("/template-tasks", { params: { query: { limit: 1 } } })).count,
    [],
  );

  const set = (key: keyof Values) => (e: { target: { value: string } }) => setValues({ ...values, [key]: e.target.value });
  const issueOf = (key: keyof Values): string | undefined => issues.find((i) => i.key === key)?.issue;

  const submit = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    const found = REQUIRED.filter((r) => values[r.key].trim() === "").map((r) => ({ key: r.key, issue: r.issue }));
    if (found.length > 0) {
      setIssues(found);
      return;
    }
    setIssues([]);
    setSaving(true);
    try {
      const plan = unwrap(
        await onboardingApi.POST("/plans", {
          body: {
            hireName: values.hireName.trim(),
            jobTitle: values.jobTitle.trim(),
            department: values.department.trim(),
            managerName: values.managerName.trim(),
            startDate: values.startDate,
          },
        }),
      );
      navigate(`/plans/${encodeURIComponent(plan.id)}`);
    } catch (err) {
      setIssues([{ key: "server", issue: messageOf(err) }]);
      setSaving(false);
    }
  };

  return (
    <PageContent>
      <AppBreadcrumbs
        items={[
          { key: "plans", label: "Onboarding plans", onClick: () => navigate("/plans") },
          { key: "new", label: "New plan" },
        ]}
      />
      <PageTitle>
        <PageTitle.Header>New onboarding plan</PageTitle.Header>
      </PageTitle>
      <Stack spacing={2}>
        <Alert severity="info">
          {template.state === "ready"
            ? `The checklist is copied from the standard template (${template.data} tasks). You can change it afterwards.`
            : "The checklist is copied from the standard template. You can change it afterwards."}
        </Alert>
        {issues.length > 0 ? (
          <Alert severity="error">
            <AlertTitle>The plan could not be created</AlertTitle>
            {issues.map((i) => (
              <div key={i.issue}>{i.issue}</div>
            ))}
          </Alert>
        ) : null}
        <Card variant="outlined">
          <CardHeader title="New hire" />
          <CardContent>
            <Box component="form" onSubmit={(e: FormEvent) => void submit(e)} noValidate>
              <Stack spacing={2}>
                <TextField label="Name" required value={values.hireName} onChange={set("hireName")} error={!!issueOf("hireName")} helperText={issueOf("hireName")} />
                <TextField label="Role" required value={values.jobTitle} onChange={set("jobTitle")} error={!!issueOf("jobTitle")} helperText={issueOf("jobTitle")} />
                <TextField label="Department" required value={values.department} onChange={set("department")} error={!!issueOf("department")} helperText={issueOf("department")} />
                <TextField
                  label="Start date"
                  type="date"
                  required
                  value={values.startDate}
                  onChange={set("startDate")}
                  slotProps={{ inputLabel: { shrink: true } }}
                  error={!!issueOf("startDate")}
                  helperText={issueOf("startDate")}
                />
                <TextField label="Manager" required value={values.managerName} onChange={set("managerName")} error={!!issueOf("managerName")} helperText={issueOf("managerName")} />
                <Stack direction="row" justifyContent="flex-end" spacing={2}>
                  <Can op="POST /plans">
                    <Button variant="contained" type="submit" disabled={saving}>
                      Create plan
                    </Button>
                  </Can>
                </Stack>
              </Stack>
            </Box>
          </CardContent>
        </Card>
      </Stack>
    </PageContent>
  );
}
