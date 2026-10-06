import { Component, OnInit, computed, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { Router } from '@angular/router';
import { IamStore } from '../../../../identity-and-access-management/application/iam.store';
import { ConfirmService } from '../../../../shared/application/confirm.service';
import { ToastService } from '../../../../shared/application/toast.service';
import { SubscriptionStore } from '../../../application/subscription.store';
import { PlanTier } from '../../../domain/model/plan.entity';

const TIER_NAME: Record<PlanTier, string> = { BASIC: 'Básico', INTERMEDIATE: 'Intermedio', COMPLETE: 'Completo' };
const PLAN_COLOR: Record<PlanTier, string> = { BASIC: '#6b7280', INTERMEDIATE: '#E07A2B', COMPLETE: '#1E3A63' };
const PLAN_ICON: Record<PlanTier, string> = { BASIC: 'pi pi-star', INTERMEDIATE: 'pi pi-star-fill', COMPLETE: 'pi pi-verified' };

/** Features per tier extracted from the README user stories. */
const PLAN_FEATURES: Record<PlanTier, string[]> = {
  BASIC: [
    '2 rutas activas', '2 conductores',
    'Registro de alumnos', 'Marcación de abordaje digital',
    'Inicio y cierre de trayecto', 'Reporte de incidencias',
    'Bitácora de viajes', 'Notificaciones de abordaje',
  ],
  INTERMEDIATE: [
    '6 rutas activas', '6 conductores',
    'Registro de alumnos', 'Marcación de abordaje digital',
    'Inicio y cierre de trayecto', 'Reporte de incidencias',
    'Bitácora de viajes', 'Alertas de proximidad (US19)',
    'Cámara en vivo del bus (US21)', 'Historial de asistencia (US22)',
  ],
  COMPLETE: [
    '20 rutas activas', '20 conductores',
    'Registro de alumnos', 'Marcación de abordaje digital',
    'Inicio y cierre de trayecto', 'Reporte de incidencias',
    'Bitácora de viajes', 'Alertas de proximidad (US19)',
    'Cámara en vivo del bus (US21)', 'Historial de asistencia (US22)',
    'GPS en tiempo real (US18)', 'Analítica de flota PDF (US7)',
    'Botón de pánico SOS (US13)',
  ],
};

@Component({
  selector: 'kt-subscription-status',
  imports: [MatButtonModule],
  templateUrl: './subscription-status.html',
  styleUrl: './subscription-status.css',
})
export class SubscriptionStatus implements OnInit {
  private readonly router = inject(Router);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);
  protected readonly iamStore = inject(IamStore);
  protected readonly store = inject(SubscriptionStore);

  protected readonly sub = this.store.subscription;
  protected readonly plan = this.store.currentPlan;
  protected readonly tier = computed<PlanTier | null>(() => this.plan()?.planTier ?? null);
  protected readonly tierName = computed(() => (this.tier() ? TIER_NAME[this.tier()!] : '—'));
  protected readonly planColor = computed(() => (this.tier() ? PLAN_COLOR[this.tier()!] : '#6b7280'));
  protected readonly planIcon = computed(() => (this.tier() ? PLAN_ICON[this.tier()!] : 'pi pi-star'));
  protected readonly features = computed(() => (this.tier() ? PLAN_FEATURES[this.tier()!] : []));

  protected readonly statusInfo = computed(() => {
    switch (this.sub()?.state) {
      case 'ACTIVE': return { label: 'Activo', color: '#22c55e', bg: '#dcfce7' };
      case 'CANCELLED': return { label: 'Cancelado', color: '#DE4A26', bg: '#fee2e2' };
      case 'EXPIRED': return { label: 'Expirado', color: '#f59e0b', bg: '#fef3c7' };
      default: return { label: '—', color: '#6b7280', bg: '#f3f4f6' };
    }
  });

  protected readonly remainingDays = computed(() => this.sub()?.getRemainingDays() ?? null);
  protected readonly progressPct = computed(() => {
    const sub = this.sub();
    const remaining = this.remainingDays();
    return sub && remaining !== null ? Math.round((remaining / sub.getTotalDays()) * 100) : 0;
  });
  protected readonly progressColor = computed(() => {
    const p = this.progressPct();
    return p > 50 ? 'var(--green)' : p > 20 ? 'var(--orange)' : '#DE4A26';
  });

  ngOnInit(): void {
    void this.store.ensureLoaded(this.iamStore.organizationId());
  }

  protected formatDate(iso: string | null): string {
    if (!iso) return '—';
    const date = new Date(iso);
    return Number.isNaN(date.getTime())
      ? iso
      : date.toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric' });
  }

  protected goToPlans(): void {
    void this.router.navigate(['/subscription-and-plan-management/plans']);
  }

  protected onCancel(): void {
    const sub = this.sub();
    if (!sub?.id) return;
    this.confirm.require({
      message: '¿Seguro que deseas cancelar tu suscripción? Perderás acceso al finalizar el período.',
      header: 'Cancelar Suscripción',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí, cancelar',
      rejectLabel: 'No, mantener',
      acceptSeverity: 'danger',
      accept: async () => {
        await this.store.cancelSubscription(sub.id!);
        this.toast.add({ severity: 'info', summary: 'Suscripción cancelada' });
      },
    });
  }
}
