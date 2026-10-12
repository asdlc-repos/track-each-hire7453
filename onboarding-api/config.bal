import ballerina/os;

// Platform-injected database connection (envBindings of the onboarding-db resource).
configurable string dbHostEnv = os:getEnv("ONBOARDING_DB_HOST");
configurable string dbPortEnv = os:getEnv("ONBOARDING_DB_PORT");
configurable string dbNameEnv = os:getEnv("ONBOARDING_DB_DBNAME");
configurable string dbUserEnv = os:getEnv("ONBOARDING_DB_USER");
configurable string dbPasswordEnv = os:getEnv("ONBOARDING_DB_PASSWORD");

# Connection settings with the local-development defaults applied.
public type DbSettings record {|
    string host;
    int port;
    string database;
    string user;
    string password;
|};

function dbSettings() returns DbSettings {
    int port = 5432;
    int|error parsed = int:fromString(dbPortEnv.trim());
    if parsed is int && parsed > 0 {
        port = parsed;
    }
    return {
        host: dbHostEnv.trim() == "" ? "localhost" : dbHostEnv.trim(),
        port,
        database: dbNameEnv.trim() == "" ? "appdb" : dbNameEnv.trim(),
        user: dbUserEnv.trim() == "" ? "postgres" : dbUserEnv.trim(),
        password: dbPasswordEnv
    };
}
