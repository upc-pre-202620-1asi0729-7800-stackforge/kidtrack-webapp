import { BaseEntity, EntityId } from '../../../shared/domain/model/base-entity';

export type HandoverOutcome = 'DELIVERED' | 'NOT_DELIVERED';

/**
 * Who received a student during a trip, or the fact that nobody registered was there to receive them.
 */
export class Handover implements BaseEntity {
  id: EntityId | null;
  tripId: EntityId | null;
  childId: EntityId | null;
  childName: string;
  authorizedPersonId: EntityId | null;
  receiverName: string;
  relationship: string;
  outcome: HandoverOutcome;
  recordedBy: string;
  recordedAt: string;
  organizationId: string | null;

  constructor({
    id = null, tripId = null, childId = null, childName = '', authorizedPersonId = null, receiverName = '',
    relationship = '', outcome = 'DELIVERED', recordedBy = '', recordedAt = new Date().toISOString(), organizationId = null,
  }: Partial<Handover> = {}) {
    this.id = id;
    this.tripId = tripId;
    this.childId = childId;
    this.childName = childName;
    this.authorizedPersonId = authorizedPersonId;
    this.receiverName = receiverName;
    this.relationship = relationship;
    this.outcome = outcome;
    this.recordedBy = recordedBy;
    this.recordedAt = recordedAt;
    this.organizationId = organizationId;
  }

  get delivered(): boolean {
    return this.outcome === 'DELIVERED';
  }

  /** Sentence shown to the driver, the administrator and the parents. */
  get summary(): string {
    if (!this.delivered) return `No se entregó: no había una persona registrada para recibir a ${this.childName}.`;
    const relationship = this.relationship ? ` (${this.relationship})` : '';
    return `${this.childName} fue recibido(a) por ${this.receiverName}${relationship}.`;
  }
}
