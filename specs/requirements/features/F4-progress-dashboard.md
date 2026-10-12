# Progress dashboard

## Purpose

HR sees each new hire's onboarding progress and what is outstanding or overdue by department.

Needs: F2.

## User Stories

- F4.1 As an HR coordinator, I see a list of new hires with their progress as tasks done out of total, and a flag on hires who have overdue tasks.
- F4.2 As an HR coordinator, I see only active plans by default, meaning not cancelled and not fully complete.
- F4.3 As an HR coordinator, I open a hire from the dashboard to see their plan and tasks.
- F4.4 As an HR coordinator, I show completed and cancelled plans too.
- F4.5 As an HR coordinator, I see for each hire how many tasks are outstanding in IT, HR and facilities.
- F4.6 As an HR coordinator, I sort the list by start date or by number of overdue tasks.

## Decisions

- The dashboard is for the HR coordinator only; task owners do not see it.
- A plan is fully complete when all its tasks are done.
- Progress is counted as done tasks out of total tasks in the plan.

## Out of Scope

- Exporting or printing dashboard data.
- Trends and historical reporting.