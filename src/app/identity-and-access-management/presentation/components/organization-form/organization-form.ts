import { Component, effect, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { TranslatePipe } from '../../../../shared/i18n/translate.pipe';
import { TranslationService } from '../../../../shared/i18n/translation.service';
import { IamStore } from '../../../application/iam.store';
import { Organization } from '../../../domain/model/organization.entity';

@Component({
  selector: 'kt-organization-form',
  imports: [FormsModule, MatButtonModule, MatFormFieldModule, MatInputModule, TranslatePipe],
  template: `
    <form class="iam-form" (ngSubmit)="submitOrganization()">
      <h2>{{ (initialOrganization()?.id ? 'identity-and-access-management.organization-form.title-edit' : 'identity-and-access-management.organization-form.title-new') | t }}</h2>

      <div class="field mb-3">
        <label for="org-name">{{ 'identity-and-access-management.fields.organization-name' | t }}</label>
        <mat-form-field appearance="outline" class="w-full" subscriptSizing="dynamic">
          <input matInput id="org-name" name="name" [(ngModel)]="name" required>
        </mat-form-field>
      </div>

      <div class="flex gap-2">
        <button mat-flat-button type="submit" [disabled]="store.loading()">
          <i [class]="store.loading() ? 'pi pi-spin pi-spinner' : 'pi pi-save'"></i>
          <span>{{ 'identity-and-access-management.actions.save' | t }}</span>
        </button>
        <button mat-flat-button class="secondary" type="button" (click)="clearFields()">
          {{ 'identity-and-access-management.actions.clear' | t }}
        </button>
      </div>

      @if (errorMessage()) { <p class="text-red-500 mt-3">{{ errorMessage() }}</p> }
    </form>
  `,
  styles: `
    .iam-form { max-width: 480px; }
    .field label { margin-bottom: 0.35rem; font-weight: 500; font-size: 0.9rem; color: var(--dark); }
  `,
})
export class OrganizationForm {
  protected readonly store = inject(IamStore);
  private readonly i18n = inject(TranslationService);

  readonly initialOrganization = input<Organization | null>(null);
  readonly organizationCreated = output<Organization>();
  readonly organizationUpdated = output<Organization>();

  protected readonly name = signal('');
  protected readonly errorMessage = signal('');

  constructor() {
    effect(() => this.name.set(this.initialOrganization()?.name ?? ''));
  }

  protected async submitOrganization(): Promise<void> {
    this.errorMessage.set('');
    const initial = this.initialOrganization();
    if (initial?.id) {
      this.organizationUpdated.emit(new Organization({ ...initial, name: this.name() }));
      return;
    }
    const created = await this.store.createOrganization(this.name());
    if (!created) {
      this.errorMessage.set(this.i18n.t('identity-and-access-management.errors.organization-create-failed'));
      return;
    }
    this.organizationCreated.emit(created);
  }

  protected clearFields(): void {
    this.name.set('');
    this.errorMessage.set('');
  }
}
