/**
 * Prisma generates its own string-enum types (e.g. `Role`, `VerificationType`,
 * `DeliveryStatus`) that are structurally identical in value to the ones
 * defined in @relayhub/domain, but TypeScript treats string enums as
 * nominally distinct types — a plain string-literal or cross-enum assignment
 * fails to compile even when the runtime values match exactly.
 *
 * `cast` is a single, deliberately narrow escape hatch for that specific,
 * known-safe boundary crossing (domain enum <-> Prisma enum, domain JSON
 * shape <-> Prisma's loosely-typed `JsonValue`). It is used ONLY at the
 * repository layer, ONLY for this purpose — never as a general substitute
 * for real typing elsewhere in the codebase.
 */
export function cast<T>(value: unknown): T {
  return value as T;
}
