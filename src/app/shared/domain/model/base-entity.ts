/** Identifier type accepted by every aggregate (json-server keeps numeric and string ids). */
export type EntityId = string | number;

/**
 * Base contract for all entities in the domain.
 * Contains the unique identifier.
 */
export interface BaseEntity {
  id: EntityId | null;
}
