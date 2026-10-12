import type { ReactElement } from "react";
import { Box, CircularProgress, Stack, Typography } from "@wso2/oxygen-ui";
import { APP_NAME } from "../appName";

export function Splash(): ReactElement {
  return (
    <Box sx={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <Stack spacing={2} alignItems="center">
        <Typography variant="h5">{APP_NAME}</Typography>
        <CircularProgress size={24} />
        <Typography variant="body2" color="text.secondary">
          Checking your session…
        </Typography>
      </Stack>
    </Box>
  );
}
