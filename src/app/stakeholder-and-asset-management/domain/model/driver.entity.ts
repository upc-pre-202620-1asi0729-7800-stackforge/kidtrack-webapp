import { BaseEntity, EntityId } from '../../../shared/domain/model/base-entity';
import { FullName } from '../../../shared/domain/model/full-name';

/**
 * Driver within the Stakeholder bounded context (backed by a "driver" profile).
 */
export class Driver implements BaseEntity {
  id: EntityId | null;
  /** IAM user linked to the driver, when the driver has an account. */
  userId: string | null;
  fullName: string;
  phone: string;
  licenseNumber: string;
  vehicleId: EntityId | null;
  active: boolean;
  organizationId: string | null;

  constructor({
    id = null, userId = null, fullName = '', phone = '', licenseNumber = '',
    vehicleId = null, active = true, organizationId = null,
  }: Partial<Driver> = {}) {
    this.id = id;
    this.userId = userId;
    this.fullName = fullName;
    this.phone = phone;
    this.licenseNumber = licenseNumber;
    this.vehicleId = vehicleId;
    this.active = active;
    this.organizationId = organizationId;
  }

  get initials(): string {
    return FullName.fromText(this.fullName).getInitials();
  }

  /** Id used by routes/trips to reference the driver (the IAM user when available). */
  get assignmentId(): string {
    return this.userId ?? String(this.id);
  }
}
