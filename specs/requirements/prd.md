# New Hire Onboarding Tracker

## Problem Statement

When someone joins, their onboarding work is spread across IT (laptop, accounts), HR (paperwork, orientation) and facilities (desk, badge). Nobody sees the whole picture, and overdue items are noticed late, so new hires start without what they need.

## Solution

A web app where HR sets up an onboarding plan for each new hire, the IT, HR and facilities teams complete their assigned tasks, and anything overdue is flagged with in-app reminders. A dashboard shows progress across all hires.

## Actors

- HR coordinator: creates onboarding plans for new hires, assigns tasks, and sees progress for every hire.
- Task owner (IT, HR or facilities team member): sees the tasks assigned to their team and marks them complete. *assumed*

## Features

- F1 [Onboarding plans](features/F1-onboarding-plans.md)
- F2 [Task assignment and completion](features/F2-task-assignment-and-completion.md)
- F3 [Overdue reminders](features/F3-overdue-reminders.md)
- F4 [Progress dashboard](features/F4-progress-dashboard.md)

## Product-wide

See [Product-wide](product-wide.md).

## Out of Scope

- Email, chat or other external reminder delivery.

## Open Questions

1. Should hiring managers or new hires also sign in to see or complete tasks? Only the HR coordinator was named as an actor.