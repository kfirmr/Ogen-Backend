# Add WORKER_API_KEY

Date: 2026-09-26

## What to add

`WORKER_API_KEY` — required, on the backend **and** on the bank-scraper worker.

## Why

The worker claims due connections, hands off SMS codes, and reports scraped transactions through
the `/bank-sync/*` endpoints. They bypass user JWTs and are authorized only by this shared token,
which the worker sends in the `between-services-token` header.

## Value

A long random string, for example the output of
`node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.
Each environment gets its own value; never commit it.
