import { BaseEntity, EntityId } from '../../../shared/domain/model/base-entity';

/**
 * Vehicle entity within the Fleet bounded context.
 */
export class Vehicle implements BaseEntity {
  id: EntityId | null;
  plate: string;
  model: string;
  capacity: number;
  active: boolean;
  organizationId: string | null;

  constructor({ id = null, plate = '', model = '', capacity = 0, active = true, organizationId = null }: Partial<Vehicle> = {}) {
    this.id = id;
    this.plate = plate;
    this.model = model;
    this.capacity = capacity;
    this.active = active;
    this.organizationId = organizationId;
  }

  get label(): string {
    return `${this.plate} — ${this.model}`;
  }
}
