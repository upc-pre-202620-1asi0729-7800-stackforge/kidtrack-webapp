import { BaseEntity, EntityId } from '../../../shared/domain/model/base-entity';
import { FullName } from '../../../shared/domain/model/full-name';

/**
 * Parent (guardian) within the Stakeholder bounded context.
 */
export class Parent implements BaseEntity {
  id: EntityId | null;
  name: string;
  email: string;
  phone: string;
  active: boolean;
  organizationId: string | null;

  constructor({ id = null, name = '', email = '', phone = '', active = true, organizationId = null }: Partial<Parent> = {}) {
    this.id = id;
    this.name = name;
    this.email = email;
    this.phone = phone;
    this.active = active;
    this.organizationId = organizationId;
  }

  get initials(): string {
    return FullName.fromText(this.name).getInitials();
  }
}
