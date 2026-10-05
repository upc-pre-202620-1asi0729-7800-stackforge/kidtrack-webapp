import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { ToastService } from '../../../../shared/application/toast.service';
import { IamStore } from '../../../application/iam.store';

const ROLE_MAP: Record<string, string> = { ADMIN: 'Administrador del Sistema', DRIVER: 'Conductor', PARENT: 'Padre / Madre' };

@Component({
  selector: 'kt-admin-profile',
  imports: [FormsModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatSlideToggleModule],
  templateUrl: './admin-profile.html',
  styleUrl: './admin-profile.css',
})
export class AdminProfile {
  private readonly iamStore = inject(IamStore);
  private readonly toast = inject(ToastService);

  private readonly user = this.iamStore.currentUser();
  protected readonly firstName = signal(this.user?.firstName ?? '');
  protected readonly lastName = signal(this.user?.lastName ?? '');
  protected email = this.user?.email ?? '';
  protected phone = this.user?.phone ?? '';
  protected readonly role = ROLE_MAP[this.user?.roleTier ?? ''] ?? 'Usuario';

  protected readonly securityData = { currentPassword: '', newPassword: '', confirmPassword: '' };
  protected readonly notifications = { emailAlerts: true, smsAlerts: false, systemUpdates: true };
  protected readonly saving = signal(false);

  protected readonly initials = computed(() => `${this.firstName().charAt(0)}${this.lastName().charAt(0)}`.toUpperCase());

  protected async saveProfile(): Promise<void> {
    this.saving.set(true);
    const ok = await this.iamStore.updateProfile({
      firstName: this.firstName(), lastName: this.lastName(), email: this.email, phone: this.phone,
    });
    this.saving.set(false);
    this.toast.add(ok
      ? { severity: 'success', summary: 'Perfil actualizado', detail: 'Tus datos fueron guardados.' }
      : { severity: 'error', summary: 'Error', detail: 'No se pudo guardar el perfil.' });
  }

  protected async saveSecurity(): Promise<void> {
    const { currentPassword, newPassword, confirmPassword } = this.securityData;
    if (!currentPassword || !newPassword) {
      this.toast.add({ severity: 'error', summary: 'Error', detail: 'Completa los campos de contraseña.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      this.toast.add({ severity: 'error', summary: 'Error', detail: 'Las contraseñas no coinciden.' });
      return;
    }
    const result = await this.iamStore.changePassword(currentPassword, newPassword);
    if (result === 'ok') {
      this.securityData.currentPassword = this.securityData.newPassword = this.securityData.confirmPassword = '';
      this.toast.add({ severity: 'success', summary: 'Contraseña actualizada' });
    } else if (result === 'invalid-current') {
      this.toast.add({ severity: 'error', summary: 'Error', detail: 'La contraseña actual es incorrecta.' });
    } else {
      this.toast.add({ severity: 'error', summary: 'Error', detail: 'No se pudo actualizar la contraseña.' });
    }
  }
}
