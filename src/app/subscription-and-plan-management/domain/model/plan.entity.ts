import { BaseEntity, EntityId } from '../../../shared/domain/model/base-entity';

export type PlanTier = 'BASIC' | 'INTERMEDIATE' | 'COMPLETE';

export const PLAN_TIER_ORDER: Record<PlanTier, number> = { BASIC: 1, INTERMEDIATE: 2, COMPLETE: 3 };

/**
 * Plan entity within the Subscription bounded context.
 */
export class Plan implements BaseEntity {
  id: EntityId | null;
  planTier: PlanTier;
  name: string;
  maxRoutes: number;
  maxDrivers: number;
  maxStudents: number;
  price: number;
  description: string;

  constructor({
    id = null, planTier = 'BASIC', name = '', maxRoutes = 0, maxDrivers = 0,
    maxStudents = 0, price = 0, description = '',
  }: Partial<Plan> = {}) {
    this.id = id;
    this.planTier = planTier;
    this.name = name;
    this.maxRoutes = maxRoutes;
    this.maxDrivers = maxDrivers;
    this.maxStudents = maxStudents;
    this.price = price;
    this.description = description;
  }

  get tierOrder(): number {
    return PLAN_TIER_ORDER[this.planTier] ?? 99;
  }

  isBasic(): boolean { return this.planTier === 'BASIC'; }
  isIntermediate(): boolean { return this.planTier === 'INTERMEDIATE'; }
  isComplete(): boolean { return this.planTier === 'COMPLETE'; }
}
