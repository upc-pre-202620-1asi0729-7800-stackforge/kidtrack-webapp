import { BaseEntity, EntityId } from '../../../shared/domain/model/base-entity';

export type OrganizationStatus = 'ACTIVE' | 'SUSPENDED';

/**
 * Organization entity within the IAM bounded context.
 * Represents a company that contracts the KidTrack platform (e.g. a school
 * transport provider) and groups users, routes, trips and a subscription.
 */
export class Organization implements BaseEntity {
  id: EntityId | null;
  name: string;
  status: OrganizationStatus;
  createdAt: string | null;

  constructor({ id = null, name = '', status = 'ACTIVE', createdAt = null }: Partial<Organization> = {}) {
    this.id = id;
    this.name = name;
    this.status = status;
    this.createdAt = createdAt;
  }

  isActive(): boolean {
    return this.status === 'ACTIVE';
  }
}
