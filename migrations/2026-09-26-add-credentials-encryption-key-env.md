# Add CREDENTIALS_ENCRYPTION_KEY

Date: 2026-09-26

## What to add

`CREDENTIALS_ENCRYPTION_KEY` — required, on the backend **and** on the bank-scraper worker.

## Why

Bank and credit-card logins are encrypted with AES-256-GCM before they are written to
`bank_connections`, and so are the SMS codes users submit during a sync. The backend encrypts; the
worker decrypts in memory right before it logs in to the bank. Both services must hold the same
key, and the backend refuses to start without it.

Rotating the key makes every stored login unreadable, so users would have to reconnect their
banks.

## Value

32 random bytes, base64-encoded (44 characters). Generate one per environment with:

`node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`

Store it in the environment's secret manager only; never commit it or reuse it across environments.
