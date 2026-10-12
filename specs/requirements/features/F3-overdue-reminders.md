# Overdue reminders

## Purpose

Overdue onboarding tasks are flagged with in-app reminders so owners and HR act on them.

Needs: F2.

## User Stories

- F3.1 As a task owner, I see a reminder for each overdue task of my department when I open the app.
- F3.2 As an HR coordinator, I see a reminder for every overdue task across all hires.
- F3.3 As a task owner, I see overdue tasks marked distinctly in my task list, most overdue first.
- F3.4 As an HR coordinator, I see how many days overdue each task is and who claimed it.
- F3.5 As a task owner, I see a count of overdue tasks in the app's navigation.

## Decisions

- A task is overdue from the day after its due date until it is marked done.
- A reminder cannot be dismissed or snoozed; it disappears only when the task is done.
- Reminders go to all members of the owning department and to the HR coordinator.
- Reminders are shown in the app only.

## Out of Scope

- Email, chat or other external delivery of reminders.
- Warnings before the due date.
- Escalation to managers.