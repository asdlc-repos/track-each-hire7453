Feature: F4 Progress dashboard

  @story-F4.1 @story-F4.5
  Rule: The dashboard shows each hire's progress, overdue flag and outstanding tasks by department

    Scenario: Progress for one hire
      Given a new plan for "Maya Fernando" has 5 tasks, 2 done, and 1 IT task overdue
      And the other 3 tasks are 1 IT, 1 HR and 1 Facilities
      When Grace the HR coordinator opens the dashboard
      Then "Maya Fernando" shows "2 of 5 done" and an overdue flag
      And "Maya Fernando" shows outstanding tasks of 2 for IT, 1 for HR and 1 for Facilities

  @story-F4.2
  Rule: By default the dashboard shows only active plans that are not complete

    Scenario: Complete and cancelled plans are hidden
      Given a plan for "Chen Wei" with every task done
      And a cancelled plan for "Lena Fischer"
      And an active plan for "Maya Fernando" with tasks still to do
      When Grace opens the dashboard
      Then "Maya Fernando" is listed
      And "Chen Wei" and "Lena Fischer" are not listed

  @story-F4.4
  Rule: The HR coordinator may include completed and cancelled plans

    Scenario: Showing everything
      Given a plan for "Chen Wei" with every task done
      And a cancelled plan for "Lena Fischer"
      When Grace chooses to include completed and cancelled plans
      Then "Chen Wei" is listed as complete
      And "Lena Fischer" is listed as cancelled

  @story-F4.3
  Rule: A hire on the dashboard opens their plan

    Scenario: Opening a hire
      Given an active plan for "Maya Fernando" with the task "Set up laptop"
      When Grace opens "Maya Fernando" from the dashboard
      Then Maya's plan is shown, listing "Set up laptop"

  @story-F4.6
  Rule: The list can be sorted by start date or by overdue tasks

    Scenario: Sorting by overdue tasks
      Given an active plan for "Maya Fernando" with 3 overdue tasks
      And an active plan for "Daniel Okoye" with 1 overdue task
      When Grace sorts the dashboard by overdue tasks
      Then "Maya Fernando" is listed before "Daniel Okoye"

    Scenario: Sorting by start date
      Given an active plan for "Maya Fernando" starting "2026-03-02"
      And an active plan for "Daniel Okoye" starting "2026-02-16"
      When Grace sorts the dashboard by start date
      Then "Daniel Okoye" is listed before "Maya Fernando"

  @story-F4.1
  Rule: Only the HR coordinator sees the dashboard

    @negative
    Scenario: A task owner has no dashboard
      Given Sam the IT task owner is signed in
      When Sam looks for the progress dashboard
      Then Sam has no progress dashboard available
