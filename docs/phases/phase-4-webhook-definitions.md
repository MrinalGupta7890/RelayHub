# Phase 4: Webhook Definitions (Sources & Destinations)

## Goal
Implement the core webhook management APIs. This allows users to create "Sources" (where webhooks enter the system) and "Destinations" (where webhooks are delivered).

## Implementation Details

1. **Domain Services:**
   - Implemented `AesEncryptionService` using AES-256-GCM.
   - Defined `Source` and `Destination` entities.

2. **Application Use Cases:**
   - `CreateSourceUseCase` and `ListSourcesUseCase`.
   - `CreateDestinationUseCase`, `ListDestinationsUseCase`, and `UpdateDestinationUseCase`.
   - The use cases automatically generate secure secrets for Sources (signing secrets) and Destinations (if applicable), encrypting them before storing them in the database.

3. **Presentation:**
   - Created `SourceController` and `DestinationController`.
   - Created `/sources` and `/destinations` routes scoped under `/environments/:envId`.

## Verification
- Validated via `pnpm typecheck`.
- Manual testing to ensure secrets are correctly generated and encrypted in the database.
