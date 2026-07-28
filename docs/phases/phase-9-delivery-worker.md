# Phase 9: Delivery Worker

## Goal
Build the worker daemon that processes `delivery.retry` jobs by actually dispatching HTTP POST requests to customer endpoints.

## Implementation Details

1. **HttpDeliveryService:**
   - Implemented `FetchHttpDeliveryService` using native `fetch`.
   - Supports configurable timeouts and captures `requestSnapshot` for auditing.

2. **SignatureGenerator:**
   - Implemented a domain service to compute outbound HMAC SHA-256 signatures (`t=...,v1=...`).

3. **ExecuteDeliveryUseCase:**
   - Orchestrates the outbound request:
     1. Decrypts the destination's secret via `AesEncryptionService`.
     2. Generates the `Webhook-Signature` header.
     3. Fires the POST request.
     4. Captures the response status, body, and duration.
     5. Updates the `DeliveryAttempt` in the database (`SUCCEEDED` or `FAILED`).

4. **DeliveryWorker:**
   - Implemented a BullMQ `Worker` daemon listening to `delivery.retry` with a concurrency of 10.

## Verification
- Validated via `pnpm typecheck`.
- Successfully delivered a webhook to `webhook.site` and verified the signature headers.
