import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';

export interface ConfirmOptions {
  message: string;
  header?: string;
  icon?: string;
  acceptLabel?: string;
  rejectLabel?: string;
  acceptSeverity?: 'danger' | 'primary';
}

@Component({
  selector: 'kt-confirm-dialog',
  imports: [MatDialogModule, MatButtonModule],
  template: `
    <div class="kt-dialog-header">
      <h3>{{ data.header || 'Confirmación' }}</h3>
    </div>
    <div class="confirm-body">
      @if (data.icon) { <i [class]="data.icon + ' confirm-icon'"></i> }
      <p>{{ data.message }}</p>
    </div>
    <div class="kt-dialog-footer">
      <button mat-button [mat-dialog-close]="false">{{ data.rejectLabel || 'No' }}</button>
      <button mat-flat-button [class.danger]="data.acceptSeverity === 'danger'" [mat-dialog-close]="true">
        {{ data.acceptLabel || 'Sí' }}
      </button>
    </div>
  `,
  styles: `
    .confirm-body { display: flex; align-items: center; gap: 1rem; padding: 0.5rem 1.5rem 0.75rem; }
    .confirm-icon { font-size: 1.8rem; color: var(--orange); flex-shrink: 0; }
    .confirm-body p { color: var(--dark); font-size: 0.92rem; line-height: 1.5; }
  `,
})
export class ConfirmDialog {
  protected readonly data = inject<ConfirmOptions>(MAT_DIALOG_DATA);
}
