import { Plan, PlanTier } from '../domain/model/plan.entity';
import { PlanResource } from './subscription.resources';

/** Maps plan resources into domain entities. */
export class PlanAssembler {
    static toEntityFromResource(resource: PlanResource): Plan {
        return new Plan({ ...resource, planTier: resource.planTier as PlanTier });
    }

    static toEntitiesFromResources(resources: PlanResource[]): Plan[] {
        return (resources ?? []).map(r => this.toEntityFromResource(r));
    }
}
