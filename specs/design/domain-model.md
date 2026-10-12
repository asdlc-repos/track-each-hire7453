# Domain model

An onboarding plan is one new hire's checklist. Its tasks are copied from the standard template when the plan is created and belong to one department each.

```mermaid
erDiagram
  ONBOARDING_PLAN ||--o{ PLAN_TASK : contains
  ONBOARDING_PLAN {
    uuid id PK
    string hireName
    string jobTitle
    string department
    string managerName
    date startDate
    string status "active | cancelled"
  }
  PLAN_TASK {
    uuid id PK
    uuid planId FK
    string title
    string department "IT | HR | Facilities"
    int dueOffsetDays "days from start date, may be negative"
    date dueDate "startDate + dueOffsetDays"
    string status "todo | done"
    string claimedByUsername
    string claimedByName
    string completedByName
    datetime completedAt
    string note
  }
  TEMPLATE_TASK {
    uuid id PK
    string title
    string department "IT | HR | Facilities"
    int dueOffsetDays
  }
```

- A template task is copied into each new plan; later template edits never change existing plans.
- Overdue is not stored: a task is overdue when it is `todo`, its plan is `active` and its due date is before today.