import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslatePipe } from '../../../../shared/i18n/translate.pipe';
import { Organization } from '../../../domain/model/organization.entity';
import { AdminRegisterForm } from '../../components/admin-register-form/admin-register-form';
import { OrganizationForm } from '../../components/organization-form/organization-form';

/**
 * Admin sign-up: 1) create the organization, 2) register its administrator.
 * Drivers and parents are added later by the admin.
 */
import { Logo } from '../../../../shared/presentation/components/logo/logo';

@Component({
  selector: 'kt-sign-up',
  imports: [Logo, MatButtonModule, TranslatePipe, OrganizationForm, AdminRegisterForm],
  templateUrl: './sign-up.html',
  styleUrl: './sign-up.css',
})
export class SignUp {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly query = toSignal(this.route.queryParamMap, { requireSync: true });

  protected readonly adminStep = signal<1 | 2>(1);
  protected readonly createdOrganization = signal<Organization | null>(null);

  /** Plan banner: populated when arriving from the landing with plan query params. */
  protected readonly selectedPlan = computed(() => {
    const name = this.query().get('planName');
    const price = this.query().get('planPrice');
    return name && price ? { name, price } : null;
  });

  protected onOrganizationCreated(organization: Organization): void {
    this.createdOrganization.set(organization);
    this.adminStep.set(2);
  }

  protected onRegistered(): void {
    const orgId = this.createdOrganization()?.id;
    const planTier = this.query().get('planTier');
    if (planTier && orgId) {
      void this.router.navigate(['/subscription-and-plan-management/checkout'], {
        queryParams: {
          plan: this.query().get('planName'),
          price: this.query().get('planPrice'),
          tier: planTier,
          orgId,
        },
      });
    } else {
      void this.router.navigate(['/identity-and-access-management/sign-in']);
    }
  }

  protected goToSignIn(): void {
    void this.router.navigate(['/identity-and-access-management/sign-in']);
  }
}
