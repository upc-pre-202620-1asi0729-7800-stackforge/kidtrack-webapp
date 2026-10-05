import { Component, OnInit, inject, signal } from '@angular/core';
import { ConfirmService } from '../../../../shared/application/confirm.service';
import { ToastService } from '../../../../shared/application/toast.service';
import { TranslatePipe } from '../../../../shared/i18n/translate.pipe';
import { IamStore } from '../../../application/iam.store';
import { Organization } from '../../../domain/model/organization.entity';
import { OrganizationForm } from '../../components/organization-form/organization-form';
import { OrganizationProfile } from '../../components/organization-profile/organization-profile';

@Component({
  selector: 'kt-organization-management',
  imports: [TranslatePipe, OrganizationForm, OrganizationProfile],
  template: `
    <div class="org-management-view p-4">
      <h1>{{ 'identity-and-access-management.organization-management.title' | t }}</h1>

      @if (!store.organization()) {
        <p>{{ 'identity-and-access-management.organization-management.empty' | t }}</p>
      } @else if (!editing()) {
        <kt-organization-profile
          [organization]="store.organization()!"
          (editRequested)="editing.set(true)"
          (suspendRequested)="onSuspendRequested($event)"/>
      } @else {
        <kt-organization-form
          [initialOrganization]="store.organization()"
          (organizationUpdated)="onUpdated($event)"/>
      }
    </div>
  `,
})
export class OrganizationManagement implements OnInit {
  protected readonly store = inject(IamStore);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);
  protected readonly editing = signal(false);

  ngOnInit(): void {
    const orgId = this.store.organizationId();
    if (orgId) void this.store.loadOrganization(orgId);
  }

  protected async onUpdated(organization: Organization): Promise<void> {
    const updated = await this.store.updateOrganization(organization);
    if (updated) this.toast.add({ severity: 'success', summary: 'Actualizado', detail: updated.name });
    this.editing.set(false);
  }

  protected onSuspendRequested(organization: Organization): void {
    this.confirm.require({
      header: 'Suspender organización',
      message: `¿Suspender ${organization.name}?`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí, suspender',
      rejectLabel: 'Cancelar',
      acceptSeverity: 'danger',
      accept: async () => {
        await this.store.updateOrganization(new Organization({ ...organization, status: 'SUSPENDED' }));
        this.toast.add({ severity: 'warn', summary: 'Organización suspendida', detail: organization.name });
      },
    });
  }
}
