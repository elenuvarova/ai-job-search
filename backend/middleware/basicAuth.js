// HTTP Basic Auth gate for the whole app (SPA + every /api/* route).
//
// This is the only thing standing between the public internet and the PII /
// LLM-quota-draining endpoints, so it is mounted EARLY in server.js, before the
// API routes and before express.static.
//
// Behaviour:
//   - /api/health is exempt so the container HEALTHCHECK (wget /api/health)
//     keeps passing even before/without credentials. Without this, Coolify
//     marks the app unhealthy and recycles it.
//   - If BASIC_AUTH_USER or BASIC_AUTH_PASSWORD is unset/empty: in development we
//     fail OPEN (next() straight through) for convenience; in PRODUCTION we fail
//     CLOSED (503 for everything except /api/health) so a missing/typo'd env var
//     can never silently publish the CV/application PII and LLM endpoints.
//   - Otherwise: parse "Authorization: Basic <base64(user:pass)>", compare in
//     constant time, and on any failure return 401 with a WWW-Authenticate
//     header so the browser shows its native login prompt.
//
// Pure stdlib (crypto + Buffer), no extra dependency.
import { timingSafeEqual } from "crypto";

// Constant-time string compare that does not leak length via early return.
// timingSafeEqual throws on unequal-length buffers, so we hash both sides to a
// fixed width first is overkill here; instead we guard the length explicitly and
// still run a comparison so the timing profile is uniform-ish for equal lengths.
function safeEqual(a, b) {
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  if (bufA.length !== bufB.length) {
    // Compare bufA against itself so we still spend time, then fail. Length
    // mismatch already tells an attacker nothing useful about the secret value.
    timingSafeEqual(bufA, bufA);
    return false;
  }
  return timingSafeEqual(bufA, bufB);
}

// Parse "Basic <base64>" into { user, pass }. The password may itself contain
// ':' (only the FIRST ':' separates user from pass), so we split on index.
// Returns null when the header is absent or not a well-formed Basic credential.
function parseBasicAuth(header) {
  if (typeof header !== "string") return null;
  const match = /^Basic (.+)$/i.exec(header.trim());
  if (!match) return null;
  let decoded;
  try {
    decoded = Buffer.from(match[1], "base64").toString("utf8");
  } catch {
    return null;
  }
  const sep = decoded.indexOf(":");
  if (sep === -1) return null;
  return { user: decoded.slice(0, sep), pass: decoded.slice(sep + 1) };
}

function challenge(res) {
  res.set("WWW-Authenticate", 'Basic realm="Restricted"');
  return res.status(401).send("Authentication required.");
}

export function basicAuth(req, res, next) {
  const expectedUser = process.env.BASIC_AUTH_USER || "";
  const expectedPass = process.env.BASIC_AUTH_PASSWORD || "";

  // Health check must always stay reachable without credentials for the
  // container HEALTHCHECK — even when auth is unconfigured.
  if (req.path === "/api/health") return next();

  // No credentials configured. Fail closed in production, open in dev.
  if (!expectedUser || !expectedPass) {
    if (process.env.NODE_ENV === "production") {
      console.error(
        "[auth] BASIC_AUTH_USER/PASSWORD not set in production — refusing requests (fail-closed)."
      );
      return res
        .status(503)
        .send("Service unavailable: authentication is not configured.");
    }
    return next();
  }

  const creds = parseBasicAuth(req.headers.authorization);
  if (!creds) return challenge(res);

  // Compare both fields in constant time. Use bitwise AND of the two results so
  // we always evaluate both comparisons regardless of whether the user matches.
  const userOk = safeEqual(creds.user, expectedUser);
  const passOk = safeEqual(creds.pass, expectedPass);
  if (userOk && passOk) return next();

  return challenge(res);
}

// True when both env vars are present and non-empty (used only for the startup log).
export function basicAuthEnabled() {
  return Boolean(process.env.BASIC_AUTH_USER && process.env.BASIC_AUTH_PASSWORD);
}
