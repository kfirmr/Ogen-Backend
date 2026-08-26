# Add CLIENT_URL

Date: 2026-08-26

## What to add

`CLIENT_URL` — optional, defaults to `http://localhost:5173`.

## Why

The browser client and the server are served from different origins, so the browser blocks the
login and sign-up requests unless the server answers the CORS preflight with the client's origin.
`CLIENT_URL` is the single origin allowed to call the API with credentials; leaving it unset only
works for local development against the Vite dev server.

## Value

The client's origin including scheme and port, without a trailing slash, for example
`https://app.ogen.co.il`. Each environment points at its own client origin.
