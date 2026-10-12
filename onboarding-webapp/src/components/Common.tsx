import type { ReactElement, ReactNode } from "react";
import { Alert, Box, Button, Chip, CircularProgress, Stack, Typography } from "@wso2/oxygen-ui";

export function Loading(): ReactElement {
  return (
    <Box sx={{ display: "flex", justifyContent: "center", p: 4 }} role="status" aria-label="Loading">
      <CircularProgress />
    </Box>
  );
}

export function LoadFailed({ what, message, onRetry }: { what: string; message?: string; onRetry?: () => void }): ReactElement {
  return (
    <Alert
      severity="error"
      action={onRetry ? <Button color="inherit" size="small" onClick={onRetry}>Try again</Button> : undefined}
    >
      {what} could not be loaded. {message ?? "Refresh the page in a moment."}
    </Alert>
  );
}

/** A titled part of a page: title, count chip, subtitle and actions at the right. */
export function SectionHeader({
  title,
  count,
  subtitle,
  actions,
}: {
  title: string;
  count?: number;
  subtitle?: string;
  actions?: ReactNode;
}): ReactElement {
  return (
    <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2} sx={{ mb: 2 }}>
      <Box>
        <Stack direction="row" spacing={1} alignItems="center">
          <Typography variant="h6">{title}</Typography>
          {count !== undefined ? <Chip size="small" label={count} /> : null}
        </Stack>
        {subtitle ? (
          <Typography variant="body2" color="text.secondary">
            {subtitle}
          </Typography>
        ) : null}
      </Box>
      {actions}
    </Stack>
  );
}

export function planStatusChip(status: "active" | "cancelled"): ReactElement {
  return status === "active" ? (
    <Chip size="small" color="info" label="Active" />
  ) : (
    <Chip size="small" variant="outlined" label="Cancelled" />
  );
}
