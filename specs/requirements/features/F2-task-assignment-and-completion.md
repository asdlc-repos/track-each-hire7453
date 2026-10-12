# Task assignment and completion

## Purpose

Tasks in a plan are assigned to IT, HR or facilities with a due date, and their owners mark them complete.

Needs: F1.

## User Stories

- F2.1 As a task owner, I see the open tasks assigned to my department across all hires, soonest due first.
- F2.2 As a task owner, I claim a task so my colleagues know I am handling it.
- F2.3 As a task owner, I mark a task of my department as done.
- F2.4 As a task owner, I reopen a task I marked done by mistake.
- F2.5 As an HR coordinator, I see who claimed each task and whether it is done.
- F2.6 As a task owner, I add a short note to a task, such as the laptop's serial number.
- F2.7 As a task owner, I release a task I claimed so another colleague can take it.

## Decisions

- Every task belongs to one department: IT, HR or facilities.
- Any member of the owning department can claim a task and mark it done, whether or not they claimed it.
- A task has two statuses: to do and done.
- Completion is recorded with who marked it done and when.

## Out of Scope

- HR assigning a task to a named person.
- In-progress or blocked statuses.