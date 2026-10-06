import { EntityId } from '../../shared/domain/model/base-entity';

export interface PlanResource {
  id: EntityId;
  planTier: string;
  name: string;
  maxRoutes: number;
  maxDrivers: number;
  maxStudents: number;
  price: number;
  description: string;
}

export interface SubscriptionResource {
  id: EntityId;
  organizationId: string;
  planId: EntityId;
  planTier?: string;
  state: string;
  startDate: string;
  endDate: string;
}
