import ballerina/http;
import ballerina/jwt;
import ballerina/os;

# What /me reports about the caller.
type CallerProfile record {|
    string username;
    string displayName;
    Department? department;
|};

// Where the gateway puts the caller's token: the signed assertion header when
// the platform publishes one, else the forwarded-token header the verifier falls back to.
final string assertionHeader = resolveAssertionHeader();

function resolveAssertionHeader() returns string {
    string name = os:getEnv("GATEWAY_ASSERTION_HEADER").trim();
    if name != "" {
        return name;
    }
    string forwarded = os:getEnv("USER_TOKEN_HEADER").trim();
    return forwarded == "" ? DEFAULT_FORWARDED_TOKEN_HEADER : forwarded;
}

# Builds the caller profile. AssertionInterceptor has already verified the token
# in this header, so the claims read here are the signed ones, never an
# unsigned x-user-* header.
#
# + req - the inbound request
# + caller - the verified caller
# + return - username, display name and task department
function callerProfile(http:Request req, GatewayCaller caller) returns CallerProfile {
    string username = caller.username == "" ? caller.userId : caller.username;
    string displayName = username;
    Department? department = ();
    string|http:HeaderNotFoundError raw = req.getHeader(assertionHeader);
    if raw is string {
        string token = raw.trim();
        if token.length() > 7 && token.substring(0, 7).toLowerAscii() == "bearer " {
            token = token.substring(7).trim();
        }
        [jwt:Header, jwt:Payload]|jwt:Error decoded = jwt:decode(token);
        if decoded is [jwt:Header, jwt:Payload] {
            jwt:Payload payload = decoded[1];
            displayName = nameFromClaims(payload, username);
            department = departmentFromGroups(groupsFromClaims(payload));
        }
    }
    return {username, displayName, department};
}

function nameFromClaims(jwt:Payload payload, string fallback) returns string {
    string full = claim(payload, "name").trim();
    if full != "" {
        return full;
    }
    string given = claim(payload, "given_name").trim();
    string family = claim(payload, "family_name").trim();
    string joined = (given + " " + family).trim();
    return joined == "" ? fallback : joined;
}

function groupsFromClaims(jwt:Payload payload) returns string[] {
    anydata raw = payload["groups"];
    string[] groups = [];
    if raw is string {
        foreach string g in re `[,\s]+`.split(raw) {
            if g != "" {
                groups.push(g);
            }
        }
    } else if raw is anydata[] {
        foreach anydata g in raw {
            if g is string {
                groups.push(g);
            }
        }
    }
    return groups;
}

# The task department of a caller: IT, HR or Facilities by their team group.
# Exact group names only, so the "HR Coordinators" group is not the HR team
# and the HR coordinator has no department.
#
# + groups - the caller's group names
# + return - the department, or () when the caller is in none of the three teams
function departmentFromGroups(string[] groups) returns Department? {
    foreach string group in groups {
        match group.trim().toLowerAscii() {
            "it team"|"it" => {
                return "IT";
            }
            "hr team"|"hr" => {
                return "HR";
            }
            "facilities team"|"facilities" => {
                return "Facilities";
            }
        }
    }
    return ();
}
