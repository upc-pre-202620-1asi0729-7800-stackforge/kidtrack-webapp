import { Component, computed, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { TranslatePipe } from '../../../../shared/i18n/translate.pipe';
import { TranslationService } from '../../../../shared/i18n/translation.service';
import { IamStore } from '../../../application/iam.store';
import { User } from '../../../domain/model/user.entity';

@Component({
  selector: 'kt-admin-register-form',
  imports: [FormsModule, MatButtonModule, MatFormFieldModule, MatInputModule, TranslatePipe],
  template: `
    <form class="iam-form" (ngSubmit)="submitRegister()">
      <h2>{{ 'identity-and-access-management.admin-register.title' | t }}</h2>

      <div class="grid">
        <div class="col-12 md:col-6 field mb-3">
          <label for="reg-first-name">{{ 'identity-and-access-management.fields.first-name' | t }}</label>
          <mat-form-field appearance="outline" class="w-full" subscriptSizing="dynamic">
            <input matInput id="reg-first-name" name="firstName" [(ngModel)]="firstName" required>
          </mat-form-field>
        </div>
        <div class="col-12 md:col-6 field mb-3">
          <label for="reg-last-name">{{ 'identity-and-access-management.fields.last-name' | t }}</label>
          <mat-form-field appearance="outline" class="w-full" subscriptSizing="dynamic">
            <input matInput id="reg-last-name" name="lastName" [(ngModel)]="lastName" required>
          </mat-form-field>
        </div>
      </div>

      <div class="field mb-3">
        <label for="reg-email">{{ 'identity-and-access-management.fields.email' | t }}</label>
        <mat-form-field appearance="outline" class="w-full" subscriptSizing="dynamic">
          <input matInput id="reg-email" type="email" name="email" [(ngModel)]="email" required>
        </mat-form-field>
      </div>

      <div class="field mb-3">
        <label for="reg-password">{{ 'identity-and-access-management.fields.password' | t }}</label>
        <mat-form-field appearance="outline" class="w-full" subscriptSizing="dynamic">
          <input matInput id="reg-password" type="password" name="password" [(ngModel)]="password" required>
        </mat-form-field>
      </div>

      <div class="field mb-3">
        <label for="reg-confirm">{{ 'identity-and-access-management.fields.confirm-password' | t }}</label>
        <mat-form-field appearance="outline" class="w-full" subscriptSizing="dynamic">
          <input matInput id="reg-confirm" type="password" name="confirmPassword" [(ngModel)]="confirmPassword" required>
        </mat-form-field>
        @if (confirmPassword() && !passwordsMatch()) {
          <small class="text-red-500">{{ 'identity-and-access-management.errors.password-mismatch' | t }}</small>
        }
      </div>

      <div class="flex gap-2">
        <button mat-flat-button type="submit" [disabled]="store.loading()">
          <i [class]="store.loading() ? 'pi pi-spin pi-spinner' : 'pi pi-user-plus'"></i>
          <span>{{ 'identity-and-access-management.actions.register' | t }}</span>
        </button>
        <button mat-flat-button class="secondary" type="button" (click)="clearFields()">
          {{ 'identity-and-access-management.actions.clear' | t }}
        </button>
      </div>

      @if (errorMessage()) { <p class="text-red-500 mt-3">{{ errorMessage() }}</p> }
    </form>
  `,
  styles: `
    .iam-form { max-width: 640px; }
    .field label { margin-bottom: 0.35rem; font-weight: 500; font-size: 0.9rem; color: var(--dark); }
  `,
})
export class AdminRegisterForm {
  protected readonly store = inject(IamStore);
  private readonly i18n = inject(TranslationService);

  readonly organizationId = input<string | null>(null);
  readonly adminRegistered = output<User>();
  readonly registrationFailed = output<void>();

  protected readonly firstName = signal('');
  protected readonly lastName = signal('');
  protected readonly email = signal('');
  protected readonly password = signal('');
  protected readonly confirmPassword = signal('');
  protected readonly errorMessage = signal('');
  protected readonly passwordsMatch = computed(() => this.password() === this.confirmPassword());

  protected async submitRegister(): Promise<void> {
    this.errorMessage.set('');
    if (!this.passwordsMatch()) {
      this.errorMessage.set(this.i18n.t('identity-and-access-management.errors.password-mismatch'));
      return;
    }
    const created = await this.store.registerAdmin({
      firstName: this.firstName(),
      lastName: this.lastName(),
      email: this.email(),
      password: this.password(),
      organizationId: this.organizationId(),
    });
    if (!created) {
      this.errorMessage.set(this.i18n.t('identity-and-access-management.errors.registration-failed'));
      this.registrationFailed.emit();
      return;
    }
    this.adminRegistered.emit(created);
  }

  protected clearFields(): void {
    for (const field of [this.firstName, this.lastName, this.email, this.password, this.confirmPassword, this.errorMessage]) {
      field.set('');
    }
  }
}
