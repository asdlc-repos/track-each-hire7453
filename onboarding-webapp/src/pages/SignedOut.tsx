import type { ReactElement } from "react";
import { Button, Stack, Typography } from "@wso2/oxygen-ui";
import { signIn } from "../authz/session";
import { GateLayout } from "../shell/GateLayout";

export function SignedOutPage(): ReactElement {
  return (
    <GateLayout>
      <Stack spacing={3} alignItems="center">
        <Typography variant="h4">You are signed out</Typography>
        <Button variant="contained" onClick={() => void signIn()}>
          Sign in
        </Button>
      </Stack>
    </GateLayout>
  );
}
