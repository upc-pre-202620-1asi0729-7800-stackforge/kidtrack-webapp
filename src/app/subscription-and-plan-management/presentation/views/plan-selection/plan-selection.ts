import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { Router } from '@angular/router';
import { IamStore } from '../../../../identity-and-access-management/application/iam.store';
import { SubscriptionStore } from '../../../application/subscription.store';
import { Plan } from '../../../domain/model/plan.entity';
import { PLAN_META, PlanMeta } from './plan-meta';

type Billing = 'monthly' | 'annual';

@Component({
  selector: 'kt-plan-selection',
  imports: [MatButtonModule],
  templateUrl: './plan-selection.html',
  styleUrl: './plan-selection.css',
})
export class PlanSelection implements OnInit {
  private readonly router = inject(Router);
  private readonly iamStore = inject(IamStore);
  protected readonly store = inject(SubscriptionStore);

  protected readonly billing = signal<Billing>('monthly');
  protected readonly currentPlanId = computed(() => this.store.subscription()?.planId ?? null);

  /** Days remaining on the active subscription (0 if none / expired). */
  protected readonly remainingDays = computed(() => this.store.subscription()?.getRemainingDays() ?? 0);

  /** Credit based on the unused portion of the current plan (US-1.S2 proration). */
  protected readonly proratedCredit = computed(() => {
    const sub = this.store.subscription();
    const current = this.store.currentPlan();
    if (!sub || !current || !this.remainingDays()) return 0;
    return parseFloat(((this.remainingDays() / sub.getTotalDays()) * current.price).toFixed(2));
  });

  ngOnInit(): void {
    void this.store.ensureLoaded(this.iamStore.organizationId());
  }

  protected meta(plan: Plan): PlanMeta {
    return PLAN_META[plan.planTier];
  }

  protected isCurrent(plan: Plan): boolean {
    return String(plan.id) === String(this.currentPlanId());
  }

  protected displayPrice(plan: Plan): number {
    const base = this.meta(plan)?.monthly ?? plan.price;
    return this.billing() === 'annual' ? Math.round(base * 0.8) : base;
  }

  protected annualTotal(plan: Plan): number {
    return Math.round((this.meta(plan)?.monthly ?? plan.price) * 12 * 0.8);
  }

  /** Price after applying the prorated credit — only for upgrades, otherwise null. */
  protected priceAfterCredit(plan: Plan): string | null {
    const currentTier = this.store.currentPlan()?.tierOrder ?? 0;
    if (plan.tierOrder <= currentTier || !this.proratedCredit()) return null;
    return Math.max(0, this.displayPrice(plan) - this.proratedCredit()).toFixed(2);
  }

  /** Navigates to the dedicated PayPal checkout page. */
  protected openPaypal(plan: Plan): void {
    if (this.isCurrent(plan)) return;
    const credit = this.priceAfterCredit(plan);
    void this.router.navigate(['/subscription-and-plan-management/checkout'], {
      queryParams: {
        plan: this.meta(plan).name,
        price: `$${credit ?? this.displayPrice(plan)}`,
        tier: plan.planTier,
        orgId: this.iamStore.organizationId(),
        credit: credit !== null ? this.proratedCredit() : undefined,
      },
    });
  }
}
