Feature: F3 Overdue reminders

  @story-F3.1 @story-F3.3 @story-F3.5
  Rule: A task is overdue from the day after its due date until it is done

    Scenario: An IT task owner sees a reminder for a late IT task
      Given a new plan for "Maya Fernando" has "Set up laptop" for IT due 3 days ago and still to do
      When Sam the IT task owner opens the app
      Then a reminder says 1 IT task is overdue
      And "Set up laptop" is marked overdue, 3 days late, at the top of Sam's list
      And the navigation shows 1 overdue task

    Scenario: A task due today is not overdue
      Given a new plan for "Maya Fernando" has "Set up laptop" for IT due today and still to do
      When Sam opens the app
      Then no overdue reminder is shown to Sam

  @story-F3.1
  Rule: A reminder disappears only when the task is done

    Scenario: Completing the task clears the reminder
      Given a new plan for "Maya Fernando" has "Set up laptop" for IT due 3 days ago and still to do
      When Sam marks "Set up laptop" as done
      Then no overdue reminder is shown to Sam

    @negative
    Scenario: A reminder cannot be dismissed
      Given a new plan for "Maya Fernando" has "Set up laptop" for IT due 3 days ago and still to do
      When Sam looks for a way to dismiss the reminder
      Then the reminder stays and the task is still overdue

  @story-F3.1 @story-F3.3
  Rule: Reminders reach only the owning department and the HR coordinator

    @negative
    Scenario: Facilities is not reminded of an IT task
      Given a new plan for "Maya Fernando" has "Set up laptop" for IT due 3 days ago and still to do
      When Nina the facilities task owner opens the app
      Then no overdue reminder is shown to Nina

  @story-F3.2 @story-F3.4
  Rule: The HR coordinator sees every overdue task with how late it is and who claimed it

    Scenario: HR sees overdue tasks across hires
      Given a new plan for "Maya Fernando" has "Set up laptop" for IT due 3 days ago, claimed by Sam
      And a new plan for "Daniel Okoye" has "Assign desk" for Facilities due 1 day ago, unclaimed
      When Grace the HR coordinator opens the overdue tasks
      Then "Set up laptop" for "Maya Fernando" shows 3 days overdue and "Sam Torres"
      And "Assign desk" for "Daniel Okoye" shows 1 day overdue and nobody
      And the 3-day task is listed first

  @story-F3.2
  Rule: A cancelled plan raises no reminders

    @negative
    Scenario: A cancelled plan's late task is not reminded
      Given Grace has cancelled the plan for "Lena Fischer", whose "Set up laptop" for IT was due 3 days ago
      When Sam opens the app
      Then no overdue reminder is shown to Sam for "Lena Fischer"
