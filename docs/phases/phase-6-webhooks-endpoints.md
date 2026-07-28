# Phase 6: Webhooks Ingestion & Endpoints

## Goal
Build the public-facing ingestion endpoint where external providers will send their webhooks into RelayHub.

## Implementation Details

1. **Signature Verification:**
   - Implemented `SignatureVerifier` domain service.
   - It validates incoming `Webhook-Signature` headers (Standard HMAC SHA-256 `t=...,v1=...` format) against the Source's signing secret.

2. **IngestEventUseCase:**
   - Orchestrates the ingestion flow:
     1. Looks up the `Source` by slug.
     2. Validates the signature (if a secret exists).
     3. Parses the payload.
     4. Saves the `Event` to the database.
     5. (Later phases will enqueue the event).

3. **Ingestion Endpoint:**
   - Created `IngestionController` and `POST /ingest/:slug`.
   - Configured Express to capture the raw HTTP request body to ensure HMAC signatures validate correctly without JSON formatting corruption.

## Verification
- Validated via `pnpm typecheck`.
- Verified HMAC signatures match standard Stripe-like webhooks.
