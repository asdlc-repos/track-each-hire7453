import ballerina/lang.runtime;
import ballerina/log;
import ballerina/sql;
import ballerinax/postgresql;
import ballerinax/postgresql.driver as _;

final DbSettings dbConfig = dbSettings();

final postgresql:Client dbClient = check new (
    host = dbConfig.host,
    username = dbConfig.user,
    password = dbConfig.password,
    database = dbConfig.database,
    port = dbConfig.port
);

// Runs before any listener starts: a database that never comes up fails the service fast.
final () dbReady = check initDb();

type Migration record {|
    int version;
    sql:ParameterizedQuery statement;
|};

// Append only. Never edit a migration that has shipped; add a new version.

function migrations() returns Migration[] {
    return [
        {version: 1, statement: `CREATE TABLE IF NOT EXISTS plans (
            id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
            hire_name TEXT NOT NULL,
            job_title TEXT NOT NULL,
            department TEXT NOT NULL,
            manager_name TEXT NOT NULL,
            start_date DATE NOT NULL,
            status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled')),
            created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )`},
        {version: 2, statement: `CREATE TABLE IF NOT EXISTS plan_tasks (
            id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
            plan_id TEXT NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
            title TEXT NOT NULL,
            department TEXT NOT NULL CHECK (department IN ('IT', 'HR', 'Facilities')),
            due_offset_days INTEGER NOT NULL,
            due_date DATE NOT NULL,
            status TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'done')),
            claimed_by_username TEXT,
            claimed_by_name TEXT,
            completed_by_name TEXT,
            completed_at TIMESTAMPTZ,
            note TEXT,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )`},
        {version: 3, statement: `CREATE INDEX IF NOT EXISTS plan_tasks_plan_idx ON plan_tasks (plan_id)`},
        {version: 4, statement: `CREATE TABLE IF NOT EXISTS template_tasks (
            id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
            title TEXT NOT NULL,
            department TEXT NOT NULL CHECK (department IN ('IT', 'HR', 'Facilities')),
            due_offset_days INTEGER NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )`}
    ];
}

function initDb() returns error? {
    int attempts = 0;
    while true {
        attempts += 1;
        error? result = migrate();
        if result is () {
            log:printInfo("database migrations applied");
            return;
        }
        if attempts >= 10 {
            return result;
        }
        log:printWarn("database not ready, retrying", attempt = attempts, 'error = result);
        runtime:sleep(3);
    }
}

function migrate() returns error? {
    _ = check dbClient->execute(`CREATE TABLE IF NOT EXISTS schema_migrations (
        version INTEGER PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`);
    // One replica at a time applies the migrations.
    transaction {
        int? _ = check dbClient->queryRow(`SELECT 1 FROM (SELECT pg_advisory_xact_lock(7453001)) AS locked`);
        check applyPending();
        check commit;
    }
}

function applyPending() returns error? {
    foreach Migration m in migrations() {
        int|sql:Error applied = dbClient->queryRow(
            `SELECT version FROM schema_migrations WHERE version = ${m.version}`);
        if applied is int {
            continue;
        }
        if applied !is sql:NoRowsError {
            return applied;
        }
        _ = check dbClient->execute(m.statement);
        _ = check dbClient->execute(`INSERT INTO schema_migrations (version) VALUES (${m.version})`);
    }
}
