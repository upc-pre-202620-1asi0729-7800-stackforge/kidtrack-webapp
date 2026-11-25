import { BaseEntity, EntityId } from '../../../shared/domain/model/base-entity';

export type NotificationType =
  | 'ABORDAJE' | 'PROXIMIDAD' | 'AUSENCIA' | 'LLEGADA' | 'RETRASO'
  | 'ENTREGA' | 'NO_ENTREGADO' | 'EMERGENCIA' | 'ACTUALIZACION';

const ICONS: Record<NotificationType, string> = {
  ABORDAJE: 'pi pi-check-circle', PROXIMIDAD: 'pi pi-map-marker',
  AUSENCIA: 'pi pi-times-circle', LLEGADA: 'pi pi-flag', RETRASO: 'pi pi-clock',
  ENTREGA: 'pi pi-verified', NO_ENTREGADO: 'pi pi-ban', EMERGENCIA: 'pi pi-exclamation-triangle',
  ACTUALIZACION: 'pi pi-info-circle',
};
const COLORS: Record<NotificationType, string> = {
  ABORDAJE: '#22c55e', PROXIMIDAD: '#f59e0b', AUSENCIA: '#DE4A26', LLEGADA: '#1E3A63', RETRASO: '#f97316',
  ENTREGA: '#16a34a', NO_ENTREGADO: '#DE4A26', EMERGENCIA: '#b91c1c', ACTUALIZACION: '#1E3A63',
};
const TITLES: Record<NotificationType, string> = {
  ABORDAJE: 'Abordaje confirmado',
  PROXIMIDAD: '¡Bus cerca!',
  AUSENCIA: 'Alumno ausente',
  LLEGADA: 'Bus llegó a destino',
  RETRASO: 'Retraso en ruta',
  ENTREGA: 'Alumno entregado',
  NO_ENTREGADO: 'Alumno no entregado',
  EMERGENCIA: 'Emergencia en ruta',
  ACTUALIZACION: 'Actualización de la emergencia',
};

/**
 * Notification sent to parents (boarding confirmations, proximity, delays…).
 * A null parentId means it is broadcast to the whole organization.
 */
export class Notification implements BaseEntity {
  id: EntityId | null;
  type: NotificationType;
  message: string;
  timestamp: string;
  read: boolean;
  parentId: EntityId | null;
  tripId: EntityId | null;
  organizationId: string | null;

  constructor({
    id = null, type = 'ABORDAJE', message = '', timestamp = new Date().toISOString(), read = false,
    parentId = null, tripId = null, organizationId = null,
  }: Partial<Notification> = {}) {
    this.id = id;
    this.type = type;
    this.message = message;
    this.timestamp = timestamp;
    this.read = read;
    this.parentId = parentId;
    this.tripId = tripId;
    this.organizationId = organizationId;
  }

  get title(): string { return TITLES[this.type] ?? 'Notificación'; }
  get icon(): string { return ICONS[this.type] ?? 'pi pi-bell'; }
  get color(): string { return COLORS[this.type] ?? '#6b7280'; }
}
