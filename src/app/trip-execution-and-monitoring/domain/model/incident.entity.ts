import { BaseEntity, EntityId } from '../../../shared/domain/model/base-entity';

export type IncidentType = 'RETRASO' | 'AVERIA' | 'ACCIDENTE' | 'COMPORTAMIENTO' | 'EMERGENCIA' | 'OTRO';
export type IncidentSeverity = 'LOW' | 'MEDIUM' | 'HIGH';
export type IncidentStatus = 'OPEN' | 'RESOLVED';
export type EmergencyType = 'ACCIDENTE' | 'ASALTO' | 'MEDICA' | 'INCENDIO';

/** Force majeure situations and the external service that attends each one. */
export const EMERGENCY_TYPES: { value: EmergencyType; label: string; icon: string; service: string; phone: string }[] = [
  { value: 'ACCIDENTE', label: 'Accidente de tránsito', icon: 'pi pi-car', service: 'Policía', phone: '105' },
  { value: 'ASALTO', label: 'Asalto', icon: 'pi pi-shield', service: 'Policía', phone: '105' },
  { value: 'MEDICA', label: 'Emergencia médica', icon: 'pi pi-heart', service: 'SAMU', phone: '106' },
  { value: 'INCENDIO', label: 'Incendio o personas atrapadas', icon: 'pi pi-bolt', service: 'Bomberos', phone: '116' },
];

export interface IncidentUpdate {
  message: string;
  sentAt: string;
  author: string;
}

export const INCIDENT_TYPES: { value: IncidentType | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'Todos los tipos' },
  { value: 'RETRASO', label: 'Retraso' },
  { value: 'AVERIA', label: 'Avería' },
  { value: 'ACCIDENTE', label: 'Accidente' },
  { value: 'COMPORTAMIENTO', label: 'Comportamiento' },
  { value: 'EMERGENCIA', label: 'Emergencia' },
  { value: 'OTRO', label: 'Otro' },
];

export const SEVERITY_LABELS: Record<IncidentSeverity, string> = { LOW: 'Leve', MEDIUM: 'Moderado', HIGH: 'Grave' };
export const SEVERITY_COLORS: Record<IncidentSeverity, string> = { LOW: '#22c55e', MEDIUM: '#f59e0b', HIGH: '#DE4A26' };
export const INCIDENT_TYPE_ICONS: Record<IncidentType, string> = {
  RETRASO: 'pi pi-clock', AVERIA: 'pi pi-wrench', ACCIDENTE: 'pi pi-exclamation-triangle',
  COMPORTAMIENTO: 'pi pi-user', EMERGENCIA: 'pi pi-phone', OTRO: 'pi pi-info-circle',
};

/**
 * Incident reported during a trip (delays, breakdowns, SOS…).
 */
export class Incident implements BaseEntity {
  id: EntityId | null;
  tripId: EntityId | null;
  routeId: EntityId | null;
  routeName: string;
  type: IncidentType;
  severity: IncidentSeverity;
  description: string;
  reportedBy: string;
  timestamp: string;
  status: IncidentStatus;
  organizationId: string | null;
  // Only filled for force majeure emergencies.
  emergencyType: EmergencyType | null;
  serviceName: string | null;
  servicePhone: string | null;
  location: string | null;
  studentIds: string[];
  studentsSafe: boolean | null;
  serviceContactedAt: string | null;
  serviceContactedBy: string | null;
  resolution: string | null;
  resolvedAt: string | null;
  updates: IncidentUpdate[];

  constructor({
    id = null, tripId = null, routeId = null, routeName = '', type = 'OTRO', severity = 'LOW',
    description = '', reportedBy = '', timestamp = new Date().toISOString(), status = 'OPEN', organizationId = null,
    emergencyType = null, serviceName = null, servicePhone = null, location = null, studentIds = [],
    studentsSafe = null, serviceContactedAt = null, serviceContactedBy = null, resolution = null, resolvedAt = null,
    updates = [],
  }: Partial<Incident> = {}) {
    this.id = id;
    this.tripId = tripId;
    this.routeId = routeId;
    this.routeName = routeName;
    this.type = type;
    this.severity = severity;
    this.description = description;
    this.reportedBy = reportedBy;
    this.timestamp = timestamp;
    this.status = status;
    this.organizationId = organizationId;
    this.emergencyType = emergencyType;
    this.serviceName = serviceName;
    this.servicePhone = servicePhone;
    this.location = location;
    this.studentIds = studentIds ?? [];
    this.studentsSafe = studentsSafe;
    this.serviceContactedAt = serviceContactedAt;
    this.serviceContactedBy = serviceContactedBy;
    this.resolution = resolution;
    this.resolvedAt = resolvedAt;
    this.updates = updates ?? [];
  }

  get isEmergency(): boolean {
    return !!this.emergencyType;
  }

  get emergency() {
    return EMERGENCY_TYPES.find(t => t.value === this.emergencyType);
  }

  get isOpenEmergency(): boolean {
    return this.isEmergency && this.status === 'OPEN';
  }

  /** State of the students as confirmed by the driver; never assumed. */
  get studentsStateLabel(): string {
    if (this.studentsSafe === null) return 'Estado de los alumnos por confirmar';
    return this.studentsSafe ? 'Los alumnos están bien' : 'Los alumnos requieren atención';
  }

  get typeLabel(): string {
    return INCIDENT_TYPES.find(t => t.value === this.type)?.label ?? this.type;
  }

  get typeIcon(): string {
    return INCIDENT_TYPE_ICONS[this.type] ?? 'pi pi-info-circle';
  }

  get severityLabel(): string {
    return SEVERITY_LABELS[this.severity] ?? this.severity;
  }

  get severityColor(): string {
    return SEVERITY_COLORS[this.severity] ?? '#6b7280';
  }
}
