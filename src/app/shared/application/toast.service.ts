import { Injectable, signal } from '@angular/core';

export type ToastSeverity = 'success' | 'info' | 'warn' | 'error';

export interface ToastMessage {
    severity: ToastSeverity;
    summary: string;
    detail?: string;
    /** Lifetime in ms (default 3000). */
    life?: number;
}

export interface ActiveToast extends ToastMessage {
    id: number;
}

/** App-wide toast notifications (same API shape as PrimeVue's useToast). */
@Injectable({ providedIn: 'root' })
export class ToastService {
    readonly toasts = signal<ActiveToast[]>([]);
    private nextId = 1;

    add(message: ToastMessage): void {
        const toast: ActiveToast = { ...message, id: this.nextId++ };
        this.toasts.update(list => [...list, toast]);
        setTimeout(() => this.remove(toast.id), message.life ?? 3000);
    }

    remove(id: number): void {
        this.toasts.update(list => list.filter(t => t.id !== id));
    }
}
