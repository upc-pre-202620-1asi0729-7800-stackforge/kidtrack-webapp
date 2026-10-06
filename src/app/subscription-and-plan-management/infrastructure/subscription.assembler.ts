import { Subscription, SubscriptionState } from '../domain/model/subscription.entity';
import { SubscriptionResource } from './subscription.resources';

/** Maps subscription resources into domain entities. */
export class SubscriptionAssembler {
  static toEntityFromResource(resource: SubscriptionResource): Subscription {
    return new Subscription({
      id: resource.id,
      organizationId: resource.organizationId,
      planId: resource.planId,
      state: resource.state as SubscriptionState,
      startDate: resource.startDate,
      endDate: resource.endDate,
    });
  }

  static toEntitiesFromResources(resources: SubscriptionResource[]): Subscription[] {
    return (resources ?? []).map(r => this.toEntityFromResource(r));
  }
}
