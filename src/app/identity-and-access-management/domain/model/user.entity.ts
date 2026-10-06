import { BaseEntity, EntityId } from '../../../shared/domain/model/base-entity';
import { FullName } from '../../../shared/domain/model/full-name';

export type RoleTier = 'ADMIN' | 'DRIVER' | 'PARENT';

/**
 * User entity within the IAM bounded context.
 */
export class User implements BaseEntity {
  id: EntityId | null;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  roleTier: RoleTier | '';
  organizationId: string | null;

  constructor({
    id = null,
    firstName = '',
    lastName = '',
    email = '',
    phone = '',
    roleTier = '',
    organizationId = null,
  }: Partial<User> = {}) {
    this.id = id;
    this.firstName = firstName;
    this.lastName = lastName;
    this.email = email;
    this.phone = phone;
    this.roleTier = roleTier;
    this.organizationId = organizationId;
  }

  get fullName(): string {
    return new FullName(this.firstName, this.lastName).getFullName();
  }

  isAdmin(): boolean {
    return this.roleTier === 'ADMIN';
  }
}
