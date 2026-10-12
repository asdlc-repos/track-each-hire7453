import type { ReactElement } from "react";
import { Alert, Card, CardContent, CardHeader, Grid, PageContent, PageTitle, Typography } from "@wso2/oxygen-ui";
import { useHeldRoles } from "../authz/gates";
import { useMe } from "../shell/Me";

export function AccountPage(): ReactElement {
  const { me, failed } = useMe();
  const roles = useHeldRoles();
  const fields = [
    { label: "Name", value: me?.displayName ?? "…" },
    { label: "Username", value: me?.username ?? "…" },
    { label: "Role", value: roles.join(", ") || "—" },
    { label: "Department", value: me ? (me.department ?? "—") : "…" },
  ];
  return (
    <PageContent>
      <PageTitle>
        <PageTitle.Header>Account</PageTitle.Header>
      </PageTitle>
      {failed ? <Alert severity="error">Your account details could not be loaded.</Alert> : null}
      <Card variant="outlined">
        <CardHeader title="Account" />
        <CardContent>
          <Grid container spacing={2}>
            {fields.map((f) => (
              <Grid key={f.label} size={{ xs: 12, md: 6 }}>
                <Typography variant="overline" color="text.secondary">
                  {f.label}
                </Typography>
                <Typography variant="body2">{f.value}</Typography>
              </Grid>
            ))}
          </Grid>
        </CardContent>
      </Card>
    </PageContent>
  );
}
