import ballerina/http;
import ballerina/sql;

const int MAX_NOTE = 500;

# The signed-in task owner: who they are and which department's tasks they reach.
type Actor record {|
    string username;
    string displayName;
    Department department;
|};

type DeptTaskRow record {|
    *TaskRow;
    string? claimedByUsername;
|};

# Resolves the actor from the gateway assertion. A caller in none of the IT, HR
# or Facilities groups (the HR coordinator) has no department and is refused
# with the contract's 401.
#
# + req - the inbound request
# + caller - the verified caller
# + return - the actor, or the 401 refusal
function resolveActor(http:Request req, GatewayCaller caller) returns Actor|http:Unauthorized {
    CallerProfile profile = callerProfile(req, caller);
    Department? department = profile.department;
    if department is () {
        return http:UNAUTHORIZED;
    }
    return {username: profile.username, displayName: profile.displayName, department};
}

function deptSelect() returns sql:ParameterizedQuery => sql:queryConcat(
    `SELECT w.*, pt.claimed_by_username AS "claimedByUsername" FROM (`, taskSelect(),
    `) w JOIN plan_tasks pt ON pt.id = w.id JOIN plans pl ON pl.id = pt.plan_id`);

function toDeptTask(DeptTaskRow row, Actor actor) returns Task {
    TaskRow base = {
        id: row.id,
        planId: row.planId,
        hireName: row.hireName,
        title: row.title,
        department: row.department,
        dueOffsetDays: row.dueOffsetDays,
        dueDate: row.dueDate,
        status: row.status,
        daysOverdue: row.daysOverdue,
        claimedBy: row.claimedBy,
        completedBy: row.completedBy,
        completedAt: row.completedAt,
        note: row.note
    };
    Task task = toTask(base);
    string? owner = row.claimedByUsername;
    task.claimedByMe = owner is string && owner == actor.username;
    return task;
}

function listDepartmentTasks(Actor actor, "todo"|"done"|"all" status, boolean overdue, int 'limit, int offset)
        returns TaskList|ApiProblem|error {
    ApiProblem? invalid = validPage('limit, offset);
    if invalid is ApiProblem {
        return invalid;
    }
    sql:ParameterizedQuery filter = ` WHERE w.department = ${actor.department} AND pl.status = 'active'`;
    if status != "all" {
        filter = sql:queryConcat(filter, ` AND w.status = ${status}`);
    }
    if overdue {
        filter = sql:queryConcat(filter, ` AND w."daysOverdue" > 0`);
    }
    int total = check dbClient->queryRow(sql:queryConcat(`SELECT count(*) FROM (`, deptSelect(), filter, `) c`));
    stream<DeptTaskRow, sql:Error?> rows = dbClient->query(sql:queryConcat(deptSelect(), filter,
        ` ORDER BY w."dueDate", pt.created_at, w.id LIMIT ${'limit} OFFSET ${offset}`));
    Task[] data = check from DeptTaskRow r in rows
        select toDeptTask(r, actor);
    string extra = string `&status=${status}&overdue=${overdue}`;
    [string?, string?] links = pageLinks("/me/department/tasks", extra, 'limit, offset, total);
    return {count: total, next: links[0], previous: links[1], data};
}

# One task, only when it is the actor's department's and its plan is active.
# Anything else is a 404, so a caller cannot learn that a foreign task exists.
function fetchDepartmentTask(Actor actor, string taskId) returns Task|ApiProblem|error {
    DeptTaskRow|sql:Error row = dbClient->queryRow(sql:queryConcat(deptSelect(),
        ` WHERE w.id = ${taskId} AND w.department = ${actor.department} AND pl.status = 'active'`));
    if row is sql:NoRowsError {
        return notFound("Task not found");
    }
    if row is sql:Error {
        return row;
    }
    return toDeptTask(row, actor);
}

# Runs one change on a task the actor reaches, then returns the task.
#
# + actor - the caller
# + taskId - the task
# + change - the UPDATE; it is guarded with the id, department and an active plan
# + return - the changed task, a 404, or an error
function changeDepartmentTask(Actor actor, string taskId, sql:ParameterizedQuery change)
        returns Task|ApiProblem|error {
    Task|ApiProblem|error current = fetchDepartmentTask(actor, taskId);
    if current !is Task {
        return current;
    }
    _ = check dbClient->execute(sql:queryConcat(change,
        ` WHERE id = ${taskId} AND department = ${actor.department}`));
    return fetchDepartmentTask(actor, taskId);
}

function claimTaskFor(Actor actor, string taskId) returns Task|ApiProblem|error =>
    changeDepartmentTask(actor, taskId, `UPDATE plan_tasks SET claimed_by_username = ${actor.username},
        claimed_by_name = ${actor.displayName}`);

// Only the claimer releases; for anyone else the task is returned unchanged.
function releaseTaskFor(Actor actor, string taskId) returns Task|ApiProblem|error {
    Task|ApiProblem|error current = fetchDepartmentTask(actor, taskId);
    if current !is Task || !current.claimedByMe {
        return current;
    }
    return changeDepartmentTask(actor, taskId,
        `UPDATE plan_tasks SET claimed_by_username = NULL, claimed_by_name = NULL`);
}

// Already done stays as it was, so the first completion's who and when are kept.
function completeTaskFor(Actor actor, string taskId) returns Task|ApiProblem|error {
    Task|ApiProblem|error current = fetchDepartmentTask(actor, taskId);
    if current !is Task || current.status == "done" {
        return current;
    }
    return changeDepartmentTask(actor, taskId, `UPDATE plan_tasks SET status = 'done',
        completed_by_name = ${actor.displayName}, completed_at = now()`);
}

function reopenTaskFor(Actor actor, string taskId) returns Task|ApiProblem|error =>
    changeDepartmentTask(actor, taskId,
        `UPDATE plan_tasks SET status = 'todo', completed_by_name = NULL, completed_at = NULL`);

function noteTaskFor(Actor actor, string taskId, TaskNote input) returns Task|ApiProblem|error {
    string text = input.note.trim();
    if text.length() > MAX_NOTE {
        return badRequest("note must be at most 500 characters");
    }
    // An empty note clears it.
    string? value = text == "" ? () : text;
    return changeDepartmentTask(actor, taskId, `UPDATE plan_tasks SET note = ${value}`);
}

# Every task of every active plan, for the HR coordinator. Overdue is computed
# at read time; most overdue first equals soonest due first.
function listAllTasks(boolean overdue, Department? department, int 'limit, int offset)
        returns TaskList|ApiProblem|error {
    ApiProblem? invalid = validPage('limit, offset);
    if invalid is ApiProblem {
        return invalid;
    }
    sql:ParameterizedQuery base = sql:queryConcat(`SELECT w.* FROM (`, taskSelect(),
        `) w JOIN plan_tasks pt ON pt.id = w.id JOIN plans pl ON pl.id = pt.plan_id`);
    sql:ParameterizedQuery filter = ` WHERE pl.status = 'active'`;
    if overdue {
        filter = sql:queryConcat(filter, ` AND w."daysOverdue" > 0`);
    }
    string extra = string `&overdue=${overdue}`;
    if department is Department {
        filter = sql:queryConcat(filter, ` AND w.department = ${department}`);
        extra += string `&department=${department}`;
    }
    int total = check dbClient->queryRow(sql:queryConcat(`SELECT count(*) FROM (`, base, filter, `) c`));
    stream<TaskRow, sql:Error?> rows = dbClient->query(sql:queryConcat(base, filter,
        ` ORDER BY w."dueDate", pt.created_at, w.id LIMIT ${'limit} OFFSET ${offset}`));
    Task[] data = check from TaskRow r in rows
        select toTask(r);
    [string?, string?] links = pageLinks("/tasks", extra, 'limit, offset, total);
    return {count: total, next: links[0], previous: links[1], data};
}
