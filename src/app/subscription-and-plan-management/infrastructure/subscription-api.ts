import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { EntityId } from '../../shared/domain/model/base-entity';
import { BaseApi } from '../../shared/infrastructure/base-api';
import { PlanResource, SubscriptionResource } from './subscription.resources';

/**
 * Infrastructure gateway for Subscription bounded-context endpoints.
 */
@Injectable({ providedIn: 'root' })
export class SubscriptionApi extends BaseApi {
  private readonly plans = this.endpoint<PlanResource>(environment.plansEndpointPath);
  private readonly subscriptions = this.endpoint<SubscriptionResource>(environment.subscriptionsEndpointPath);

  getAllPlans(): Observable<PlanResource[]> {
    return this.plans.getAll();
  }

  getActiveSubscriptionsByOrganization(organizationId: string): Observable<SubscriptionResource[]> {
    return this.subscriptions.getAll({ organizationId, state: 'ACTIVE' });
  }

  createSubscription(request: Omit<SubscriptionResource, 'id'>): Observable<SubscriptionResource> {
    return this.subscriptions.create(request);
  }

  patchSubscription(id: EntityId, partial: Partial<SubscriptionResource>): Observable<SubscriptionResource> {
    return this.subscriptions.patch(id, partial);
  }
}
