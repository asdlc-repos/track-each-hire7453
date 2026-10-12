Feature: F2 Task assignment and completion

  @story-F2.1
  Rule: A task owner sees only their own department's open tasks, soonest due first

    Scenario: IT sees IT tasks ordered by due date
      Given a new plan for "Maya Fernando" has "Create email account" for IT due "2026-03-02" and "Set up laptop" for IT due "2026-02-27"
      And the plan also has "Assign desk" for Facilities
      When Sam the IT task owner opens the task list
      Then "Set up laptop" is listed before "Create email account"
      And "Assign desk" is not listed

  @story-F2.2 @story-F2.7
  Rule: A task owner may claim a task and release it again

    Scenario: Claiming a task
      Given a new plan for "Maya Fernando" has the unclaimed task "Set up laptop" for IT
      When Sam claims "Set up laptop"
      Then "Set up laptop" shows "Sam Torres" as who claimed it

    Scenario: Releasing a task
      Given Sam has claimed "Set up laptop" in a new plan for "Maya Fernando"
      When Sam releases "Set up laptop"
      Then "Set up laptop" shows nobody as who claimed it

  @story-F2.3 @story-F2.4
  Rule: Any member of the owning department may mark a task done, and reopen it

    Scenario: A colleague completes a task someone else claimed
      Given Sam has claimed "Set up laptop" in a new plan for "Maya Fernando"
      When Ivan, another IT task owner, marks "Set up laptop" as done
      Then "Set up laptop" is done and shows "Ivan" as who completed it

    Scenario: Reopening a task marked done by mistake
      Given Sam has marked "Set up laptop" as done in a new plan for "Maya Fernando"
      When Sam reopens "Set up laptop"
      Then "Set up laptop" is to do again

  @story-F2.3
  Rule: Only a member of the owning department may complete its tasks

    @negative
    Scenario: Facilities cannot complete an IT task
      Given a new plan for "Maya Fernando" has the task "Set up laptop" for IT
      When Nina the facilities task owner tries to mark "Set up laptop" as done
      Then "Set up laptop" is still to do

  @story-F2.5
  Rule: The HR coordinator sees who claimed each task and whether it is done

    Scenario: HR sees claim and completion
      Given Sam has claimed "Set up laptop" and Nina has completed "Assign desk" in a new plan for "Maya Fernando"
      When Grace the HR coordinator opens Maya's plan
      Then "Set up laptop" shows "Sam Torres" and is to do
      And "Assign desk" shows "Nina Patel" and is done

  @story-F2.5
  Rule: The HR coordinator does not claim or complete tasks

    @negative
    Scenario: HR coordinator cannot mark a task done
      Given a new plan for "Maya Fernando" has the task "Set up laptop" for IT
      When Grace the HR coordinator tries to mark "Set up laptop" as done
      Then "Set up laptop" is still to do

  @story-F2.6
  Rule: A task owner may add a note to a task of their department

    Scenario: Saving a serial number
      Given Sam has claimed "Set up laptop" in a new plan for "Maya Fernando"
      When Sam saves the note "Serial C02XK1" on "Set up laptop"
      Then "Set up laptop" shows the note "Serial C02XK1"
