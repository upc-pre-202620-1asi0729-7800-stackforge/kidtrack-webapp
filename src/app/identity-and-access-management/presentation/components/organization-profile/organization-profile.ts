import { Component, computed, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { TranslatePipe } from '../../../../shared/i18n/translate.pipe';
import { Organization } from '../../../domain/model/organization.entity';

@Component({
  selector: 'kt-organization-profile',
  imports: [MatButtonModule, MatCardModule, TranslatePipe],
  template: `
    <mat-card class="org-profile" appearance="outlined">
      <mat-card-header>
        <mat-card-title class="org-title">{{ organization().name }}</mat-card-title>
        <mat-card-subtitle>
          <span class="kt-tag" [class.success]="isActive()" [class.danger]="!isActive()">
            {{ (isActive() ? 'identity-and-access-management.organization.status.active' : 'identity-and-access-management.organization.status.suspended') | t }}
          </span>
        </mat-card-subtitle>
      </mat-card-header>
      <mat-card-content>
        <div class="grid mt-2">
          <div class="col-12 md:col-6">
            <strong>{{ 'identity-and-access-management.organization.field.id' | t }}:</strong> {{ organization().id }}
          </div>
          <div class="col-12 md:col-6">
            <strong>{{ 'identity-and-access-management.organization.field.created-at' | t }}:</strong> {{ formattedCreatedAt() }}
          </div>
        </div>
      </mat-card-content>
      <mat-card-actions class="flex gap-2">
        <button mat-flat-button (click)="editRequested.emit(organization())">
          <i class="pi pi-pencil"></i><span>{{ 'identity-and-access-management.actions.edit' | t }}</span>
        </button>
        @if (isActive()) {
          <button mat-flat-button class="danger" (click)="suspendRequested.emit(organization())">
            <i class="pi pi-ban"></i><span>{{ 'identity-and-access-management.actions.suspend' | t }}</span>
          </button>
        }
      </mat-card-actions>
    </mat-card>
  `,
  styles: `
    .org-profile { max-width: 640px; padding: 0.5rem; border-radius: 12px; }
    .org-title { font-family: var(--heading); font-size: 1.3rem; font-weight: 700; color: var(--dark); margin-bottom: 0.5rem; }
    mat-card-content { color: var(--dark); font-size: 0.92rem; }
    mat-card-actions { padding: 0.5rem 1rem 1rem; }
  `,
})
export class OrganizationProfile {
  readonly organization = input.required<Organization>();
  readonly editRequested = output<Organization>();
  readonly suspendRequested = output<Organization>();

  protected readonly isActive = computed(() => this.organization().isActive());
  protected readonly formattedCreatedAt = computed(() => {
    const createdAt = this.organization().createdAt;
    if (!createdAt) return '—';
    const date = new Date(createdAt);
    return Number.isNaN(date.getTime()) ? createdAt : date.toLocaleDateString();
  });
}
