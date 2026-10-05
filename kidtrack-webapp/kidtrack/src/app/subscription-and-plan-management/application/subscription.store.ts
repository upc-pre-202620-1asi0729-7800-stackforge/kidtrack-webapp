import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { EntityId } from '../../shared/domain/model/base-entity';
import { Plan } from '../domain/model/plan.entity';
import { Subscription } from '../domain/model/subscription.entity';
import { PlanAssembler } from '../infrastructure/plan.assembler';
import { SubscriptionApi } from '../infrastructure/subscription-api';
import { SubscriptionAssembler } from '../infrastructure/subscription.assembler';

const DEFAULT_DURATION_DAYS = 30;

/**
 * Signal store for the Subscription bounded context: plan catalog and the
 * organization's active subscription with its quotas.
 */
@Injectable({ providedIn: 'root' })
export class SubscriptionStore {
    private readonly api = inject(SubscriptionApi);

    readonly plans = signal<Plan[]>([]);
    readonly subscription = signal<Subscription | null>(null);
    readonly plansLoaded = signal(false);
    readonly subscriptionLoaded = signal(false);
    readonly loading = signal(false);
    readonly errors = signal<unknown[]>([]);

    readonly sortedPlans = computed(() => [...this.plans()].sort((a, b) => a.tierOrder - b.tierOrder));
    readonly currentPlan = computed(() => {
        const sub = this.subscription();
        return sub ? this.plans().find(p => String(p.id) === String(sub.planId)) ?? null : null;
    });

    async loadPlans(): Promise<void> {
        this.loading.set(true);
        try {
            this.plans.set(PlanAssembler.toEntitiesFromResources(await firstValueFrom(this.api.getAllPlans())));
            this.plansLoaded.set(true);
        } catch (error) {
            this.pushError(error);
        } finally {
            this.loading.set(false);
        }
    }

    async loadSubscription(organizationId: string): Promise<void> {
        this.loading.set(true);
        try {
            const list = SubscriptionAssembler.toEntitiesFromResources(
                await firstValueFrom(this.api.getActiveSubscriptionsByOrganization(organizationId)),
            );
            this.subscription.set(list[0] ?? null);
            this.subscriptionLoaded.set(true);
        } catch (error) {
            this.pushError(error);
        } finally {
            this.loading.set(false);
        }
    }

    /** Ensures plans and the org subscription are loaded (used by views that only read quotas). */
    async ensureLoaded(organizationId: string | null): Promise<void> {
        if (!this.plansLoaded()) await this.loadPlans();
        if (organizationId) await this.loadSubscription(organizationId);
    }

    /** Creates an ACTIVE subscription, cancelling any previous active one for the organization. */
    async createSubscription(request: { organizationId: string; planId: EntityId; planTier?: string }): Promise<Subscription | null> {
        this.loading.set(true);
        try {
            const active = await firstValueFrom(this.api.getActiveSubscriptionsByOrganization(request.organizationId));
            for (const sub of active) {
                await firstValueFrom(this.api.patchSubscription(sub.id, { state: 'CANCELLED' }));
            }
            const start = new Date();
            const end = new Date(start.getTime() + DEFAULT_DURATION_DAYS * 86_400_000);
            const created = SubscriptionAssembler.toEntityFromResource(
                await firstValueFrom(this.api.createSubscription({
                    organizationId: request.organizationId,
                    planId: request.planId,
                    planTier: request.planTier,
                    state: 'ACTIVE',
                    startDate: start.toISOString(),
                    endDate: end.toISOString(),
                })),
            );
            this.subscription.set(created);
            return created;
        } catch (error) {
            this.pushError(error);
            return null;
        } finally {
            this.loading.set(false);
        }
    }

    async upgradeSubscription(id: EntityId, planId: EntityId): Promise<void> {
        await this.patch(id, { planId });
    }

    async cancelSubscription(id: EntityId): Promise<void> {
        await this.patch(id, { state: 'CANCELLED' });
    }

    private async patch(id: EntityId, partial: { planId?: EntityId; state?: string }): Promise<void> {
        this.loading.set(true);
        try {
            this.subscription.set(SubscriptionAssembler.toEntityFromResource(await firstValueFrom(this.api.patchSubscription(id, partial))));
        } catch (error) {
            this.pushError(error);
        } finally {
            this.loading.set(false);
        }
    }

    private pushError(error: unknown): void {
        this.errors.update(list => [...list, error]);
    }
}
