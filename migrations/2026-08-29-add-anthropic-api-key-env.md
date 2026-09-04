# Add ANTHROPIC_API_KEY

Date: 2026-08-29

## What to add

`ANTHROPIC_API_KEY` — required.

## Why

The statement-import upload pipeline calls the Anthropic API to classify a transaction's vendor
whenever its description doesn't match any known `vendor_aliases` pattern. The AI client is
constructed at server startup, so the server refuses to start without this key.

## Value

An Anthropic API key from the Anthropic console, in the form `sk-ant-...`. Each environment gets
its own key; never share a key across environments and never commit it to the repository.
