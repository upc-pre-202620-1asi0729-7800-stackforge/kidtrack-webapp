import { BaseEntity, EntityId } from '../../../shared/domain/model/base-entity';

/**
 * Person registered to receive a student. The driver only hands the student over to one of these people.
 */
export class AuthorizedPerson implements BaseEntity {
  id: EntityId | null;
  childId: EntityId | null;
  fullName: string;
  documentNumber: string;
  relationship: string;
  phone: string;
  organizationId: string | null;

  constructor({
    id = null, childId = null, fullName = '', documentNumber = '', relationship = '', phone = '', organizationId = null,
  }: Partial<AuthorizedPerson> = {}) {
    this.id = id;
    this.childId = childId;
    this.fullName = fullName;
    this.documentNumber = documentNumber;
    this.relationship = relationship;
    this.phone = phone;
    this.organizationId = organizationId;
  }
}
