import ballerina/http;
import ballerina/sql;
import ballerina/time;

# A request problem the caller can fix: 400 or 404.
type ApiProblem distinct error<record {|int status;|}>;

type PlanSummaryCreated record {|
    *http:Created;
    PlanSummary body;
|};

type TaskCreated record {|
    *http:Created;
    Task body;
|};

type TemplateTaskCreated record {|
    *http:Created;
    TemplateTask body;
|};

type TemplateTaskOk record {|
    *http:Ok;
    TemplateTask body;
|};

type PlanRow record {|
    string id;
    string hireName;
    string jobTitle;
    string department;
    string managerName;
    string startDate;
    string status;
    int totalTasks;
    int doneTasks;
    int overdueTasks;
    int itOpen;
    int hrOpen;
    int facilitiesOpen;
|};

type TaskRow record {|
    string id;
    string planId;
    string hireName;
    string title;
    string department;
    int dueOffsetDays;
    string dueDate;
    string status;
    int daysOverdue;
    string? claimedBy;
    string? completedBy;
    string? completedAt;
    string? note;
|};

type TemplateRow record {|
    string id;
    string title;
    string department;
    int dueOffsetDays;
|};

const int MAX_TEXT = 200;
const int MAX_OFFSET_DAYS = 3650;

function badRequest(string message) returns ApiProblem => error ApiProblem(message, status = 400);

function notFound(string message) returns ApiProblem => error ApiProblem(message, status = 404);

# Maps a request problem to its contract error response.
#
# + p - the problem
# + return - the 400 or 404 response carrying the shared Error body
function problemResponse(ApiProblem p) returns ErrorBadRequest|ErrorNotFound {
    if p.detail().status == 404 {
        return <ErrorNotFound>{body: {code: 404, message: "Not found", description: p.message()}};
    }
    return <ErrorBadRequest>{body: {code: 400, message: "Bad request", description: p.message()}};
}

function toDepartment(string value) returns Department {
    match value {
        "IT" => {
            return "IT";
        }
        "HR" => {
            return "HR";
        }
    }
    return "Facilities";
}

function validText(string value) returns boolean {
    string trimmed = value.trim();
    return trimmed.length() > 0 && trimmed.length() <= MAX_TEXT;
}

function validDate(string value) returns boolean {
    string text = value.trim();
    if !re `\d{4}-\d{2}-\d{2}`.isFullMatch(text) {
        return false;
    }
    time:Utc|error parsed = time:utcFromString(text + "T00:00:00Z");
    if parsed is error {
        return false;
    }
    time:Civil civil = time:utcToCivil(parsed);
    return civil.year >= 1970 && civil.year <= 2200 && text == string `${civil.year}-${civil.month < 10 ? "0" : ""}${civil.month}-${civil.day < 10 ? "0" : ""}${civil.day}`;
}

function validOffset(int days) returns boolean => days >= -MAX_OFFSET_DAYS && days <= MAX_OFFSET_DAYS;

function validPage(int 'limit, int offset) returns ApiProblem? {
    if 'limit < 1 || 'limit > 100 {
        return badRequest("limit must be between 1 and 100");
    }
    if offset < 0 {
        return badRequest("offset must not be negative");
    }
    return ();
}

function pageLinks(string path, string extra, int 'limit, int offset, int total) returns [string?, string?] {
    string? next = ();
    string? previous = ();
    if offset + 'limit < total {
        next = string `${path}?limit=${'limit}&offset=${offset + 'limit}${extra}`;
    }
    if offset > 0 {
        int before = offset - 'limit < 0 ? 0 : offset - 'limit;
        previous = string `${path}?limit=${'limit}&offset=${before}${extra}`;
    }
    return [next, previous];
}

// ---------------------------------------------------------------- plans

function planSelect() returns sql:ParameterizedQuery => `SELECT * FROM (
    SELECT p.id, p.hire_name AS "hireName", p.job_title AS "jobTitle", p.department,
        p.manager_name AS "managerName", to_char(p.start_date, 'YYYY-MM-DD') AS "startDate", p.status,
        (SELECT count(*) FROM plan_tasks t WHERE t.plan_id = p.id) AS "totalTasks",
        (SELECT count(*) FROM plan_tasks t WHERE t.plan_id = p.id AND t.status = 'done') AS "doneTasks",
        (SELECT count(*) FROM plan_tasks t WHERE t.plan_id = p.id AND t.status = 'todo'
            AND p.status = 'active' AND t.due_date < current_date) AS "overdueTasks",
        (SELECT count(*) FROM plan_tasks t WHERE t.plan_id = p.id AND t.status = 'todo'
            AND p.status = 'active' AND t.department = 'IT') AS "itOpen",
        (SELECT count(*) FROM plan_tasks t WHERE t.plan_id = p.id AND t.status = 'todo'
            AND p.status = 'active' AND t.department = 'HR') AS "hrOpen",
        (SELECT count(*) FROM plan_tasks t WHERE t.plan_id = p.id AND t.status = 'todo'
            AND p.status = 'active' AND t.department = 'Facilities') AS "facilitiesOpen",
        p.created_at AS "createdAt"
    FROM plans p
) s`;

function toSummary(PlanRow row) returns PlanSummary {
    "active"|"cancelled" status = row.status == "cancelled" ? "cancelled" : "active";
    return {
        id: row.id,
        hireName: row.hireName,
        jobTitle: row.jobTitle,
        department: row.department,
        managerName: row.managerName,
        startDate: row.startDate,
        status,
        totalTasks: row.totalTasks,
        doneTasks: row.doneTasks,
        overdueTasks: row.overdueTasks,
        outstandingByDepartment: {IT: row.itOpen, HR: row.hrOpen, Facilities: row.facilitiesOpen},
        complete: row.totalTasks > 0 && row.doneTasks == row.totalTasks
    };
}

function fetchPlan(string planId) returns PlanSummary|ApiProblem|error {
    sql:ParameterizedQuery q = sql:queryConcat(planSelect(), ` WHERE s.id = ${planId}`);
    PlanRow|sql:Error row = dbClient->queryRow(q);
    if row is sql:NoRowsError {
        return notFound("Plan not found");
    }
    if row is sql:Error {
        return row;
    }
    return toSummary(row);
}

function listPlans(boolean includeClosed, "startDate"|"overdueTasks" sort, int 'limit, int offset)
        returns PlanSummaryList|ApiProblem|error {
    ApiProblem? invalid = validPage('limit, offset);
    if invalid is ApiProblem {
        return invalid;
    }
    sql:ParameterizedQuery filter = includeClosed ? ` WHERE 1 = 1`
        : ` WHERE s.status = 'active' AND NOT (s."totalTasks" > 0 AND s."doneTasks" = s."totalTasks")`;
    sql:ParameterizedQuery orderBy = sort == "overdueTasks"
        ? ` ORDER BY s."overdueTasks" DESC, s."startDate", s."createdAt", s.id`
        : ` ORDER BY s."startDate", s."createdAt", s.id`;
    int total = check dbClient->queryRow(sql:queryConcat(`SELECT count(*) FROM (`, planSelect(), `) c`,
        includeClosed ? ` WHERE 1 = 1` : ` WHERE c.status = 'active' AND NOT (c."totalTasks" > 0 AND c."doneTasks" = c."totalTasks")`));
    sql:ParameterizedQuery q = sql:queryConcat(planSelect(), filter, orderBy,
        ` LIMIT ${'limit} OFFSET ${offset}`);
    stream<PlanRow, sql:Error?> rows = dbClient->query(q);
    PlanSummary[] data = check from PlanRow r in rows
        select toSummary(r);
    [string?, string?] links = pageLinks("/plans", string `&includeClosed=${includeClosed}&sort=${sort}`,
        'limit, offset, total);
    return {count: total, next: links[0], previous: links[1], data};
}

function createPlan(NewPlan input) returns PlanSummary|ApiProblem|error {
    if !validText(input.hireName) || !validText(input.jobTitle) || !validText(input.department)
            || !validText(input.managerName) {
        return badRequest("hireName, jobTitle, department and managerName are required and at most 200 characters");
    }
    string startDate = input.startDate.trim();
    if !validDate(startDate) {
        return badRequest("startDate must be a date in the form YYYY-MM-DD");
    }
    string planId = "";
    transaction {
        planId = check dbClient->queryRow(`INSERT INTO plans (hire_name, job_title, department, manager_name, start_date)
            VALUES (${input.hireName.trim()}, ${input.jobTitle.trim()}, ${input.department.trim()},
                ${input.managerName.trim()}, ${startDate}::date) RETURNING id`);
        // The template is copied once, here; later template edits never reach this plan.
        _ = check dbClient->execute(`INSERT INTO plan_tasks (plan_id, title, department, due_offset_days, due_date)
            SELECT ${planId}, title, department, due_offset_days, ${startDate}::date + due_offset_days
            FROM template_tasks ORDER BY created_at, id`);
        check commit;
    }
    return fetchPlan(planId);
}

function updatePlan(string planId, PlanChange change) returns PlanSummary|ApiProblem|error {
    PlanSummary|ApiProblem|error current = fetchPlan(planId);
    if current is ApiProblem || current is error {
        return current;
    }
    if current.status == "cancelled" {
        return badRequest("A cancelled plan cannot be changed");
    }
    string hireName = change?.hireName ?: current.hireName;
    string jobTitle = change?.jobTitle ?: current.jobTitle;
    string department = change?.department ?: current.department;
    string managerName = change?.managerName ?: current.managerName;
    string startDate = change?.startDate ?: current.startDate;
    if !validText(hireName) || !validText(jobTitle) || !validText(department) || !validText(managerName) {
        return badRequest("hireName, jobTitle, department and managerName must not be empty and at most 200 characters");
    }
    startDate = startDate.trim();
    if !validDate(startDate) {
        return badRequest("startDate must be a date in the form YYYY-MM-DD");
    }
    transaction {
        _ = check dbClient->execute(`UPDATE plans SET hire_name = ${hireName.trim()}, job_title = ${jobTitle.trim()},
            department = ${department.trim()}, manager_name = ${managerName.trim()}, start_date = ${startDate}::date
            WHERE id = ${planId}`);
        if startDate != current.startDate {
            _ = check dbClient->execute(`UPDATE plan_tasks SET due_date = ${startDate}::date + due_offset_days
                WHERE plan_id = ${planId}`);
        }
        check commit;
    }
    return fetchPlan(planId);
}

function cancelPlan(string planId) returns PlanSummary|ApiProblem|error {
    sql:ExecutionResult result = check dbClient->execute(`UPDATE plans SET status = 'cancelled' WHERE id = ${planId}`);
    if result.affectedRowCount == 0 {
        return notFound("Plan not found");
    }
    return fetchPlan(planId);
}

// ---------------------------------------------------------------- template

function toTemplateTask(TemplateRow row) returns TemplateTask => {
    id: row.id,
    title: row.title,
    department: toDepartment(row.department),
    dueOffsetDays: row.dueOffsetDays
};

function validTemplateInput(NewTemplateTask input) returns ApiProblem? {
    if !validText(input.title) {
        return badRequest("title is required and at most 200 characters");
    }
    if !validOffset(input.dueOffsetDays) {
        return badRequest("dueOffsetDays must be between -3650 and 3650");
    }
    return ();
}

function templateSelect() returns sql:ParameterizedQuery =>
    `SELECT id, title, department, due_offset_days AS "dueOffsetDays" FROM template_tasks`;

function listTemplateTasks(int 'limit, int offset) returns TemplateTaskList|ApiProblem|error {
    ApiProblem? invalid = validPage('limit, offset);
    if invalid is ApiProblem {
        return invalid;
    }
    int total = check dbClient->queryRow(`SELECT count(*) FROM template_tasks`);
    stream<TemplateRow, sql:Error?> rows = dbClient->query(sql:queryConcat(templateSelect(),
        ` ORDER BY created_at, id LIMIT ${'limit} OFFSET ${offset}`));
    TemplateTask[] data = check from TemplateRow r in rows
        select toTemplateTask(r);
    [string?, string?] links = pageLinks("/template-tasks", "", 'limit, offset, total);
    return {count: total, next: links[0], previous: links[1], data};
}

function fetchTemplateTask(string id) returns TemplateTask|ApiProblem|error {
    TemplateRow|sql:Error row = dbClient->queryRow(sql:queryConcat(templateSelect(), ` WHERE id = ${id}`));
    if row is sql:NoRowsError {
        return notFound("Template task not found");
    }
    if row is sql:Error {
        return row;
    }
    return toTemplateTask(row);
}

function createTemplateTask(NewTemplateTask input) returns TemplateTask|ApiProblem|error {
    ApiProblem? invalid = validTemplateInput(input);
    if invalid is ApiProblem {
        return invalid;
    }
    string id = check dbClient->queryRow(`INSERT INTO template_tasks (title, department, due_offset_days)
        VALUES (${input.title.trim()}, ${input.department}, ${input.dueOffsetDays}) RETURNING id`);
    return fetchTemplateTask(id);
}

function updateTemplateTask(string id, NewTemplateTask input) returns TemplateTask|ApiProblem|error {
    ApiProblem? invalid = validTemplateInput(input);
    if invalid is ApiProblem {
        return invalid;
    }
    sql:ExecutionResult result = check dbClient->execute(`UPDATE template_tasks SET title = ${input.title.trim()},
        department = ${input.department}, due_offset_days = ${input.dueOffsetDays} WHERE id = ${id}`);
    if result.affectedRowCount == 0 {
        return notFound("Template task not found");
    }
    return fetchTemplateTask(id);
}

function deleteTemplateTask(string id) returns ApiProblem?|error {
    sql:ExecutionResult result = check dbClient->execute(`DELETE FROM template_tasks WHERE id = ${id}`);
    if result.affectedRowCount == 0 {
        return notFound("Template task not found");
    }
    return ();
}

// ---------------------------------------------------------------- plan tasks

function taskSelect() returns sql:ParameterizedQuery => `SELECT t.id, t.plan_id AS "planId", p.hire_name AS "hireName",
    t.title, t.department, t.due_offset_days AS "dueOffsetDays", to_char(t.due_date, 'YYYY-MM-DD') AS "dueDate",
    t.status,
    CASE WHEN t.status = 'todo' AND p.status = 'active' AND t.due_date < current_date
        THEN current_date - t.due_date ELSE 0 END AS "daysOverdue",
    t.claimed_by_name AS "claimedBy", t.completed_by_name AS "completedBy",
    to_char(t.completed_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS "completedAt", t.note
    FROM plan_tasks t JOIN plans p ON p.id = t.plan_id`;

function toTask(TaskRow row) returns Task => {
    id: row.id,
    planId: row.planId,
    hireName: row.hireName,
    title: row.title,
    department: toDepartment(row.department),
    dueOffsetDays: row.dueOffsetDays,
    dueDate: row.dueDate,
    status: row.status == "done" ? "done" : "todo",
    daysOverdue: row.daysOverdue,
    claimedBy: row.claimedBy,
    claimedByMe: false,
    completedBy: row.completedBy,
    completedAt: row.completedAt,
    note: row.note
};

function fetchPlanTask(string planId, string taskId) returns Task|ApiProblem|error {
    TaskRow|sql:Error row = dbClient->queryRow(
        sql:queryConcat(taskSelect(), ` WHERE t.id = ${taskId} AND t.plan_id = ${planId}`));
    if row is sql:NoRowsError {
        return notFound("Task not found");
    }
    if row is sql:Error {
        return row;
    }
    return toTask(row);
}

type PlanState record {|
    string status;
    string startDate;
|};

function planState(string planId) returns PlanState|ApiProblem|error {
    PlanState|sql:Error row = dbClient->queryRow(
        `SELECT status, to_char(start_date, 'YYYY-MM-DD') AS "startDate" FROM plans WHERE id = ${planId}`);
    if row is sql:NoRowsError {
        return notFound("Plan not found");
    }
    return row;
}

function listPlanTasks(string planId, int 'limit, int offset) returns TaskList|ApiProblem|error {
    ApiProblem? invalid = validPage('limit, offset);
    if invalid is ApiProblem {
        return invalid;
    }
    PlanState|ApiProblem|error state = planState(planId);
    if state is ApiProblem || state is error {
        return state;
    }
    int total = check dbClient->queryRow(`SELECT count(*) FROM plan_tasks WHERE plan_id = ${planId}`);
    stream<TaskRow, sql:Error?> rows = dbClient->query(sql:queryConcat(taskSelect(),
        ` WHERE t.plan_id = ${planId} ORDER BY t.due_date, t.created_at, t.id LIMIT ${'limit} OFFSET ${offset}`));
    Task[] data = check from TaskRow r in rows
        select toTask(r);
    [string?, string?] links = pageLinks(string `/plans/${planId}/tasks`, "", 'limit, offset, total);
    return {count: total, next: links[0], previous: links[1], data};
}

function addPlanTask(string planId, NewPlanTask input) returns Task|ApiProblem|error {
    PlanState|ApiProblem|error state = planState(planId);
    if state is ApiProblem || state is error {
        return state;
    }
    if state.status != "active" {
        return badRequest("Tasks cannot be added to a cancelled plan");
    }
    if !validText(input.title) {
        return badRequest("title is required and at most 200 characters");
    }
    if !validOffset(input.dueOffsetDays) {
        return badRequest("dueOffsetDays must be between -3650 and 3650");
    }
    string taskId = check dbClient->queryRow(`INSERT INTO plan_tasks (plan_id, title, department, due_offset_days, due_date)
        VALUES (${planId}, ${input.title.trim()}, ${input.department}, ${input.dueOffsetDays},
            ${state.startDate}::date + ${input.dueOffsetDays}::int) RETURNING id`);
    return fetchPlanTask(planId, taskId);
}

function updatePlanTask(string planId, string taskId, PlanTaskChange change) returns Task|ApiProblem|error {
    PlanState|ApiProblem|error state = planState(planId);
    if state is ApiProblem || state is error {
        return state;
    }
    Task|ApiProblem|error current = fetchPlanTask(planId, taskId);
    if current is ApiProblem || current is error {
        return current;
    }
    if state.status != "active" {
        return badRequest("Tasks of a cancelled plan cannot be changed");
    }
    string title = change?.title ?: current.title;
    Department department = change?.department ?: current.department;
    int offsetDays = change?.dueOffsetDays ?: current.dueOffsetDays;
    if !validText(title) {
        return badRequest("title must not be empty and at most 200 characters");
    }
    if !validOffset(offsetDays) {
        return badRequest("dueOffsetDays must be between -3650 and 3650");
    }
    _ = check dbClient->execute(`UPDATE plan_tasks SET title = ${title.trim()}, department = ${department},
        due_offset_days = ${offsetDays}, due_date = ${state.startDate}::date + ${offsetDays}::int
        WHERE id = ${taskId} AND plan_id = ${planId}`);
    return fetchPlanTask(planId, taskId);
}

function removePlanTask(string planId, string taskId) returns ApiProblem?|error {
    PlanState|ApiProblem|error state = planState(planId);
    if state is ApiProblem || state is error {
        return state;
    }
    if state.status != "active" {
        // The contract's delete has no 400; a cancelled plan's tasks are no longer addressable.
        return notFound("Tasks of a cancelled plan cannot be removed");
    }
    sql:ExecutionResult result = check dbClient->execute(
        `DELETE FROM plan_tasks WHERE id = ${taskId} AND plan_id = ${planId}`);
    if result.affectedRowCount == 0 {
        return notFound("Task not found");
    }
    return ();
}
