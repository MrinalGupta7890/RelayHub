/**
 * Cursor-based pagination contract used by every list-returning repository
 * method (Section 20: cursor pagination chosen over offset pagination
 * because it stays stable under the high insert rate of Event/DeliveryAttempt
 * tables — an offset shifts under you while new events keep arriving).
 */
export interface CursorPageParams {
  limit: number;
  cursor?: string | null;
}

export interface CursorPage<T> {
  items: T[];
  nextCursor: string | null;
}
