Feature: F1 Onboarding plans

  @story-F1.1 @story-F1.2
  Rule: A new plan starts from the standard checklist

    Scenario: Creating a plan copies the template's tasks
      Given the standard checklist holds "Set up laptop" for IT and "Assign desk" for Facilities
      When Grace the HR coordinator creates a plan for "Maya Fernando", role "Software Engineer", department "Engineering", manager "Ravi Perera", starting "2026-03-02"
      Then Maya's plan lists "Set up laptop" for IT and "Assign desk" for Facilities
      And the plan shows the manager "Ravi Perera"

  @story-F1.1
  Rule: A plan needs the hire's name, role, department, start date and manager

    @negative
    Scenario: A plan without a start date is refused
      Given Grace has the plan form open
      When Grace submits it for "Maya Fernando" with no start date
      Then no plan is added to the plans list

  @story-F1.1
  Rule: Only the HR coordinator manages onboarding plans

    @negative
    Scenario: A task owner has no plan management
      Given Sam the IT task owner is signed in
      When Sam looks for the onboarding plans
      Then Sam has no onboarding plans list or plan form available

  @story-F1.3
  Rule: The HR coordinator may add, change and remove tasks in a hire's plan

    Scenario: Adding a task to a plan
      Given Grace has opened a new plan for "Maya Fernando" starting "2026-03-02"
      When Grace adds the task "Order business cards" for Facilities, due 5 days after the start date
      Then the plan lists "Order business cards" for Facilities, due "2026-03-07"

    Scenario: Removing a task from a plan
      Given Grace has opened a new plan for "Maya Fernando" that lists "Assign desk"
      When Grace removes "Assign desk" from the plan
      Then the plan no longer lists "Assign desk"

    @negative
    Scenario: A task without a title is refused
      Given Grace has opened a new plan for "Maya Fernando"
      When Grace adds a task with no title
      Then the number of tasks in the plan is unchanged

  @story-F1.4
  Rule: Editing the standard checklist changes future plans only

    Scenario: A template edit does not reach an existing plan
      Given Grace has created a plan for "Maya Fernando" from a checklist holding "Set up laptop"
      When Grace adds "Order business cards" to the standard checklist
      Then Maya's plan does not list "Order business cards"
      And a plan created afterwards for "Daniel Okoye" lists "Order business cards"

  @story-F1.5
  Rule: Changing the start date moves every due date with it

    Scenario: A later start date shifts due dates
      Given Grace has opened a plan for "Maya Fernando" starting "2026-03-02" with "Set up laptop" due 3 days before the start date
      When Grace changes the start date to "2026-03-09"
      Then "Set up laptop" is due "2026-03-06"

  @story-F1.6
  Rule: The HR coordinator sees every plan and can open any one

    Scenario: A cancelled plan stays in the list
      Given Grace has created a plan for "Maya Fernando"
      And Grace has created a plan for "Lena Fischer" and cancelled it
      When Grace opens the onboarding plans list
      Then the list includes "Maya Fernando" as active and "Lena Fischer" as cancelled

  @story-F1.7
  Rule: A cancelled plan's tasks leave every task list and reminder

    Scenario: Cancelling a plan hides its tasks from the IT list
      Given Grace has created a plan for "Lena Fischer" that lists "Set up laptop" for IT
      When Grace cancels Lena's plan
      Then Sam the IT task owner's task list does not include "Set up laptop" for "Lena Fischer"
