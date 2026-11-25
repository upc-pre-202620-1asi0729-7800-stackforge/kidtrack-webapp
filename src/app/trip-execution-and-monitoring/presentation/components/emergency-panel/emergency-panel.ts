import { Component, computed, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { ToastService } from '../../../../shared/application/toast.service';
import { StakeholderStore } from '../../../../stakeholder-and-asset-management/application/stakeholder.store';
import { TripStore } from '../../../application/trip.store';
import { Incident } from '../../../domain/model/incident.entity';

type StudentsState = 'UNCHANGED' | 'SAFE' | 'NEEDS_CARE';

/**
 * Follow-up of a force majeure emergency: call to the external service, news for the parents and,
 * for administrators, closure with its outcome.
 */
@Component({
  selector: 'kt-emergency-panel',
  imports: [FormsModule, MatButtonModule],
  templateUrl: './emergency-panel.html',
  styleUrl: './emergency-panel.css',
})
export class EmergencyPanel {
  private readonly tripStore = inject(TripStore);
  private readonly stakeholderStore = inject(StakeholderStore);
  private readonly toast = inject(ToastService);

  readonly incident = input.required<Incident>();
  /** Whether the user may record the call and send news (driver of the trip or administrator). */
  readonly canAct = input(true);
  /** Only administrators close an emergency. */
  readonly canResolve = input(false);

  protected message = '';
  protected studentsState: StudentsState = 'UNCHANGED';
  protected resolution = '';
  protected readonly busy = signal(false);

  protected readonly studentNames = computed(() => {
    const ids = this.incident().studentIds;
    return this.stakeholderStore.children().filter(c => ids.includes(String(c.id))).map(c => c.name).join(', ');
  });

  protected time(iso: string | null): string {
    return iso ? new Date(iso).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }) : '';
  }

  protected async recordCall(): Promise<void> {
    await this.run(this.tripStore.recordServiceCall(this.incident().id!), 'Llamada registrada. Se avisó a los padres.');
  }

  protected async sendUpdate(): Promise<void> {
    const message = this.message.trim();
    if (!message) return;
    const safe = this.studentsState === 'UNCHANGED' ? null : this.studentsState === 'SAFE';
    const sent = await this.run(
      this.tripStore.addIncidentUpdate(this.incident().id!, message, safe), 'Actualización enviada a los padres.');
    if (sent) {
      this.message = '';
      this.studentsState = 'UNCHANGED';
    }
  }

  protected async resolve(): Promise<void> {
    const resolution = this.resolution.trim();
    if (!resolution) return;
    await this.run(this.tripStore.resolveIncident(this.incident().id!, resolution), 'Emergencia cerrada. Se avisó a los padres.');
  }

  private async run(action: Promise<Incident | null>, successDetail: string): Promise<boolean> {
    this.busy.set(true);
    const saved = await action;
    this.busy.set(false);
    this.toast.add(saved
      ? { severity: 'success', summary: 'Listo', detail: successDetail }
      : { severity: 'error', summary: 'Error', detail: 'No se pudo completar la acción. Intenta de nuevo.' });
    return !!saved;
  }
}
