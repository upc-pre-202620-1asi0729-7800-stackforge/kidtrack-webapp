/**
 * Shared kernel identifiers (value objects) referenced across bounded contexts.
 * Matches shared.domain.model in the shared component diagram.
 */
abstract class Identifier {
  constructor(public readonly value: string = '') {}

  equals(other: Identifier | null | undefined): boolean {
    return !!other && other.value === this.value;
  }

  toString(): string {
    return this.value;
  }
}

export class OrganizationId extends Identifier {}
export class UserId extends Identifier {}
export class ParentId extends Identifier {}
export class DriverId extends Identifier {}
export class ChildId extends Identifier {}
export class RouteId extends Identifier {}
export class TripId extends Identifier {}
