import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslatePipe } from '../../../../shared/i18n/translate.pipe';
import { TranslationService } from '../../../../shared/i18n/translation.service';
import { IamStore } from '../../../application/iam.store';

type SignInMode = 'user' | 'admin';

import { Logo } from '../../../../shared/presentation/components/logo/logo';

@Component({
  selector: 'kt-sign-in',
  imports: [Logo, FormsModule, MatButtonModule, MatButtonToggleModule, MatFormFieldModule, MatInputModule, TranslatePipe],
  templateUrl: './sign-in.html',
  styleUrl: './sign-in.css',
})
export class SignIn {
  protected readonly store = inject(IamStore);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly i18n = inject(TranslationService);

  protected readonly mode = signal<SignInMode>('user');
  protected readonly modeOptions = [
    { label: 'identity-and-access-management.sign-in.mode.user', value: 'user' as SignInMode, icon: 'pi pi-users' },
    { label: 'identity-and-access-management.sign-in.mode.admin', value: 'admin' as SignInMode, icon: 'pi pi-shield' },
  ];

  protected email = '';
  protected password = '';
  protected readonly errorMessage = signal('');

  protected async submit(): Promise<void> {
    this.errorMessage.set('');
    const user = await this.store.signIn(this.email, this.password);
    if (!user) {
      this.errorMessage.set(this.i18n.t('identity-and-access-management.errors.invalid-credentials'));
      return;
    }
    if (this.mode() === 'user' && user.roleTier === 'ADMIN') {
      this.errorMessage.set(this.i18n.t('identity-and-access-management.errors.use-admin-tab'));
      this.store.signOut();
      return;
    }
    if (this.mode() === 'admin' && user.roleTier !== 'ADMIN') {
      this.errorMessage.set(this.i18n.t('identity-and-access-management.errors.not-admin'));
      this.store.signOut();
      return;
    }
    const redirect = this.route.snapshot.queryParamMap.get('redirect');
    await this.router.navigateByUrl(redirect || '/home');
  }

  protected goToSignUp(): void {
    void this.router.navigate(['/identity-and-access-management/sign-up']);
  }
}
