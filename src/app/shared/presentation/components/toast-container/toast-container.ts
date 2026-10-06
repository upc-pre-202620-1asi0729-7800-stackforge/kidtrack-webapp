import { Component, inject } from '@angular/core';
import { ToastService, ToastSeverity } from '../../../application/toast.service';

const ICONS: Record<ToastSeverity, string> = {
  success: 'pi pi-check-circle',
  info: 'pi pi-info-circle',
  warn: 'pi pi-exclamation-triangle',
  error: 'pi pi-times-circle',
};

/** Renders the stacked toasts (top-right), PrimeVue-like. */
@Component({
  selector: 'kt-toast-container',
  template: `
    <div class="toast-stack">
      @for (toast of toastService.toasts(); track toast.id) {
        <div class="toast" [class]="'toast toast-' + toast.severity" role="status">
          <i [class]="icons[toast.severity] + ' toast-icon'"></i>
          <div class="toast-text">
            <strong>{{ toast.summary }}</strong>
            @if (toast.detail) { <span>{{ toast.detail }}</span> }
          </div>
          <button class="toast-close" (click)="toastService.remove(toast.id)" aria-label="Cerrar">
            <i class="pi pi-times"></i>
          </button>
        </div>
      }
    </div>
  `,
  styles: `
    .toast-stack {
      position: fixed; top: 20px; right: 20px; z-index: 2000;
      display: flex; flex-direction: column; gap: 0.75rem; width: min(360px, calc(100vw - 40px));
    }
    .toast {
      display: flex; align-items: flex-start; gap: 0.75rem;
      padding: 0.9rem 1rem; border-radius: 8px;
      border: 1px solid; border-left-width: 6px;
      box-shadow: 0 6px 20px rgba(0,0,0,0.12);
      animation: toastIn 0.25s ease-out;
      font-size: 0.875rem;
    }
    .toast-success { background: #f0fdf4; border-color: #bbf7d0; border-left-color: #22c55e; color: #15803d; }
    .toast-info    { background: #eff6ff; border-color: #bfdbfe; border-left-color: #3b82f6; color: #1d4ed8; }
    .toast-warn    { background: #fffbeb; border-color: #fde68a; border-left-color: #f59e0b; color: #b45309; }
    .toast-error   { background: #fef2f2; border-color: #fecaca; border-left-color: #DE4A26; color: #b91c1c; }
    .toast-icon { font-size: 1.1rem; margin-top: 2px; }
    .toast-text { flex: 1; display: flex; flex-direction: column; gap: 0.2rem; }
    .toast-text strong { font-weight: 700; }
    .toast-close { background: none; border: none; color: inherit; cursor: pointer; opacity: 0.7; padding: 2px; }
    .toast-close:hover { opacity: 1; }
    @keyframes toastIn { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: none; } }
  `,
})
export class ToastContainer {
  protected readonly toastService = inject(ToastService);
  protected readonly icons = ICONS;
}
