# Incident Response Runbook (App Tokens & Auth)
## Scope
Bearer JWT compromise, key leakage, or anomalous auth behavior affecting `purple_team_app`.

## Immediate Actions (T+0–15m)
1. **Freeze deploys**: Lock main & staging. Notify #eng-sec.
2. **Key rotation**:
   - Add a **new KID** and secret in `JWT_KEYS_JSON`.
   - Set `ACTIVE_JWT_KID` to the new kid. Do **not** remove old kid yet.
3. **Blacklist**:
   - If `jti` present and blacklist store is up, add compromised JTIs.
   - If Redis down, enable in-memory emergency denylist and start draining to Redis when restored.
4. **Force re-auth** (if high severity): Reduce max token TTL; invalidate sessions at API gateway if present.

## Containment (T+15–60m)
1. **Rotate downstream secrets** used by the app (DB creds, third-party tokens).
2. **Deploy** with new KID active, HSTS on, and increased auth logs (without PII).

## Eradication (T+1–4h)
1. Remove old KID from `JWT_KEYS_JSON` (grace window dependent on TTL).
2. Run search across logs/metrics for anomalous issuers/audiences or replay patterns.

## Recovery (T+4–24h)
1. Validate customer logins & rate limits remain healthy.
2. Enable additional Semgrep queries for auth flows; review PRs since last good state.

## Lessons (T+24–72h)
1. Postmortem: timeline, blast radius, mitigations.
2. Permanent controls: shorter TTL, `aud`/`iss` enforcement in middleware, regular key rotation cadence.
