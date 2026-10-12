import { useEffect, useState, type FormEvent, type ReactElement } from "react";
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Stack, TextField } from "@wso2/oxygen-ui";
import type { components } from "../generated/onboarding-api";
import { messageOf } from "../lib/api-helpers";

export type Department = components["schemas"]["Department"];
export const DEPARTMENTS: readonly Department[] = ["IT", "HR", "Facilities"];

export interface TaskValues {
  title: string;
  department: Department;
  dueOffsetDays: number;
}

/** Add or edit one checklist task: shared by a plan's tasks and the template. */
export function TaskDialog({
  open,
  heading,
  initial,
  onClose,
  onSave,
}: {
  open: boolean;
  heading: string;
  initial: TaskValues | null;
  onClose: () => void;
  onSave: (values: TaskValues) => Promise<void>;
}): ReactElement {
  const [title, setTitle] = useState("");
  const [department, setDepartment] = useState<Department>("IT");
  const [offset, setOffset] = useState("0");
  const [issues, setIssues] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTitle(initial?.title ?? "");
    setDepartment(initial?.department ?? "IT");
    setOffset(String(initial?.dueOffsetDays ?? 0));
    setIssues([]);
    setSaving(false);
  }, [open, initial]);

  const submit = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    const problems: string[] = [];
    if (title.trim() === "") problems.push("Give the task a title");
    if (offset.trim() === "" || !Number.isInteger(Number(offset))) problems.push("Enter the due day as a whole number");
    if (problems.length > 0) {
      setIssues(problems);
      return;
    }
    setSaving(true);
    try {
      await onSave({ title: title.trim(), department, dueOffsetDays: Number(offset) });
    } catch (err) {
      setIssues([messageOf(err)]);
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{heading}</DialogTitle>
      <Box component="form" onSubmit={(e: FormEvent) => void submit(e)} noValidate>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {issues.length > 0 ? (
              <Alert severity="error">
                {issues.map((issue) => (
                  <div key={issue}>{issue}</div>
                ))}
              </Alert>
            ) : null}
            <TextField
              label="Task"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              error={issues.includes("Give the task a title")}
              helperText={issues.includes("Give the task a title") ? "Give the task a title" : undefined}
            />
            <TextField select label="Department" value={department} onChange={(e) => setDepartment(e.target.value as Department)}>
              {DEPARTMENTS.map((d) => (
                <MenuItem key={d} value={d}>
                  {d}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Due, in days from the start date (negative is before)"
              type="number"
              value={offset}
              onChange={(e) => setOffset(e.target.value)}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button variant="outlined" onClick={onClose}>
            Close
          </Button>
          <Button variant="contained" type="submit" disabled={saving}>
            Save task
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}
