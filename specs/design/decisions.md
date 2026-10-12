# Technical decisions

- \[architecture\] Overdue is worked out when a list is read, from the due date, the task status and the plan status; there is no stored flag, scheduler or notification component. *assumed* (F3, F4)
- \[architecture\] The dashboard reads progress counts that the plan list returns for each plan, not a separate reporting endpoint. *assumed* (F4)
- \[data-model\] A plan task stores its due offset in days and its due date; changing the plan's start date recomputes every due date from the offsets. *assumed* (F1)
- \[data-model\] Dates are calendar days with no time zone, and "today" is the server's date. *assumed* (F3)
- \[security\] There is one task-owner role per department (IT, HR, facilities), each bound to its own group, and the API reads the caller's department from that group. *assumed* (F2, F3)
- \[security\] A task owner reads their department's tasks through /me/department/tasks, and the HR coordinator reads every task through /tasks. *assumed* (F2, F3)
- \[onboarding-webapp\] The count of overdue tasks in the navigation comes from the department list filtered to overdue tasks. *assumed* (F3)