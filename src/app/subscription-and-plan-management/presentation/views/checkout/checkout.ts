import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { environment } from '../../../../../environments/environment';
import { IamStore } from '../../../../identity-and-access-management/application/iam.store';
import { SubscriptionStore } from '../../../application/subscription.store';

type CheckoutStatus = 'idle' | 'success' | 'error' | 'cancelled';

const TIER_TO_PLAN_ID: Record<string, string> = {
  BASIC: 'plan-basic',
  INTERMEDIATE: 'plan-intermediate',
  COMPLETE: 'plan-complete',
};

/* Minimal typings for the PayPal JS SDK surface used here. */
interface PaypalOrderActions {
  order: {
    create(order: unknown): Promise<string>;
    capture(): Promise<unknown>;
  };
}
interface PaypalSdk {
  Buttons(config: {
    style: Record<string, string | number>;
    createOrder(data: unknown, actions: PaypalOrderActions): Promise<string>;
    onApprove(data: unknown, actions: PaypalOrderActions): Promise<void>;
    onCancel(): void;
    onError(err: unknown): void;
  }): { render(selector: string): Promise<void> };
}
declare global {
  interface Window { paypal?: PaypalSdk; }
}

import { Logo } from '../../../../shared/presentation/components/logo/logo';

@Component({
  selector: 'kt-checkout',
  imports: [Logo],
  templateUrl: './checkout.html',
  styleUrl: './checkout.css',
})
export class Checkout implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly iamStore = inject(IamStore);
  private readonly subscriptionStore = inject(SubscriptionStore);

  private readonly query = this.route.snapshot.queryParamMap;
  protected readonly planName = this.query.get('plan') ?? '';
  protected readonly planPrice = this.query.get('price') ?? '';
  private readonly orgId = this.query.get('orgId');
  private readonly planTier = this.query.get('tier') ?? '';

  protected readonly status = signal<CheckoutStatus>('idle');
  protected readonly sdkReady = signal(false);
  private scriptEl: HTMLScriptElement | null = null;

  async ngOnInit(): Promise<void> {
    try {
      await this.loadPaypalSdk();
      this.sdkReady.set(true);
      this.renderButtons();
    } catch (error) {
      console.error(error);
      this.status.set('error');
    }
  }

  ngOnDestroy(): void {
    if (this.scriptEl?.isConnected) this.scriptEl.remove();
  }

  protected goBack(): void {
    void this.router.navigate(this.iamStore.isAuthenticated()
      ? ['/subscription-and-plan-management/plans']
      : ['/identity-and-access-management/sign-in']);
  }

  private numericPrice(): string {
    const match = String(this.planPrice).replace(',', '.').match(/(\d+\.?\d*)/);
    return match ? match[1] : '9.99';
  }

  private loadPaypalSdk(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (window.paypal) { resolve(); return; }
      const existing = document.getElementById('paypal-sdk-co');
      if (existing) { existing.addEventListener('load', () => resolve()); return; }
      const script = document.createElement('script');
      script.id = 'paypal-sdk-co';
      script.src = `https://www.paypal.com/sdk/js?client-id=${environment.paypalClientId}&currency=USD&intent=capture&components=buttons`;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('PayPal SDK failed to load'));
      document.head.appendChild(script);
      this.scriptEl = script;
    });
  }

  private renderButtons(): void {
    const amount = this.numericPrice();
    void window.paypal!.Buttons({
      style: { layout: 'vertical', color: 'gold', shape: 'rect', label: 'pay', height: 48 },
      createOrder: (_data, actions) => actions.order.create({
        purchase_units: [{
          description: `KidTrack — Plan ${this.planName}`,
          amount: { currency_code: 'USD', value: amount },
        }],
      }),
      onApprove: async (_data, actions) => {
        await actions.order.capture();
        if (this.orgId) {
          await this.subscriptionStore.createSubscription({
            organizationId: this.orgId,
            planId: TIER_TO_PLAN_ID[this.planTier] ?? this.planTier,
            planTier: this.planTier,
          });
        }
        this.status.set('success');
        setTimeout(() => void this.router.navigate(this.iamStore.isAuthenticated()
          ? ['/subscription-and-plan-management/status']
          : ['/identity-and-access-management/sign-in']), 2500);
      },
      onCancel: () => this.status.set('cancelled'),
      onError: err => {
        console.error('PayPal error', err);
        this.status.set('error');
      },
    }).render('#paypal-button-container');
  }
}
