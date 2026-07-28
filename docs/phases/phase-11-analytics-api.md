# Phase 11: End-to-End Analytics & Dashboard API

## Goal
Expose the generated webhook histories and delivery attempt logs via API so the frontend dashboard can render them.

## Implementation Details

1. **Use Cases:**
   - `GetSourceEventsUseCase`: Retrieves a paginated list of events for a specific Source.
   - `GetEventAttemptsUseCase`: Fetches the entire retry history (`DeliveryAttempts`) for a specific Event.
   - `GetDestinationAttemptsUseCase`: Retrieves a paginated list of attempts for a specific Destination.

2. **Tenancy Validation:**
   - Each use case rigorously validates that the requested entity belongs to the `environmentId` injected by the authentication middleware.

3. **Presentation:**
   - Created `AnalyticsController` and mounted routes under `/api/v1/environments/:envId/analytics/*`.
   - Secured endpoints with `requireAuth`, `tenancyGuard`, and `requireRole(["OWNER", "ADMIN", "MEMBER"])`.

## Verification
- Validated via `pnpm typecheck`.
- Successfully queried the `/analytics` routes to retrieve event history.
