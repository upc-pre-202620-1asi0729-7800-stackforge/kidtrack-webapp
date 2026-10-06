import { BaseEntity, EntityId } from '../../../shared/domain/model/base-entity';

export type SubscriptionState = 'ACTIVE' | 'CANCELLED' | 'EXPIRED';

const DAY_MS = 86_400_000;

/**
 * Subscription entity within the Subscription bounded context.
 * Links an Organization (from IAM) to a Plan during a date range.
 */
export class Subscription implements BaseEntity {
  id: EntityId | null;
  organizationId: string | null;
  planId: EntityId | null;
  state: SubscriptionState;
  startDate: string | null;
  endDate: string | null;

  constructor({
    id = null, organizationId = null, planId = null, state = 'ACTIVE', startDate = null, endDate = null,
  }: Partial<Subscription> = {}) {
    this.id = id;
    this.organizationId = organizationId;
    this.planId = planId;
    this.state = state;
    this.startDate = startDate;
    this.endDate = endDate;
  }

  isActive(): boolean {
    return this.state === 'ACTIVE';
  }

  /** Days remaining until endDate, clamped at zero. Null if no valid endDate. */
  getRemainingDays(): number | null {
    if (!this.endDate) return null;
    const end = new Date(this.endDate).getTime();
    if (Number.isNaN(end)) return null;
    return Math.max(0, Math.ceil((end - Date.now()) / DAY_MS));
  }

  /** Length of the billing period in days (30 when unknown). */
  getTotalDays(): number {
    if (!this.startDate || !this.endDate) return 30;
    return Math.max(1, Math.ceil((new Date(this.endDate).getTime() - new Date(this.startDate).getTime()) / DAY_MS));
  }
}
