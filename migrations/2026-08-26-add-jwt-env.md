# Add JWT_SECRET and JWT_EXPIRES_IN_SECONDS

Date: 2026-08-26

## What to add

`JWT_SECRET` — required.
`JWT_EXPIRES_IN_SECONDS` — optional, defaults to 604800 (7 days).

## Why

The auth module signs an access token on sign-up and login, and the global `TokenGuard` verifies
that token on every non-public route. Both use `JWT_SECRET`, so the server refuses to start without
it. `JWT_EXPIRES_IN_SECONDS` controls how long an issued token stays valid before the client must
log in again.

## Value

`JWT_SECRET` is a high-entropy random string, at least 32 bytes, unique per environment — a token
signed in one environment must never verify in another. Generate it with `openssl rand -base64 48`
and store it in the environment's secret manager.

`JWT_EXPIRES_IN_SECONDS` is a whole number of seconds, for example `604800`.
