import { BaseEntity, EntityId } from '../../../shared/domain/model/base-entity';

export type IncidentType = 'RETRASO' | 'AVERIA' | 'ACCIDENTE' | 'COMPORTAMIENTO' | 'EMERGENCIA' | 'OTRO';
export type IncidentSeverity = 'LOW' | 'MEDIUM' | 'HIGH';
export type IncidentStatus = 'OPEN' | 'RESOLVED';

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

    constructor({
                    id = null, tripId = null, routeId = null, routeName = '', type = 'OTRO', severity = 'LOW',
                    description = '', reportedBy = '', timestamp = new Date().toISOString(), status = 'OPEN', organizationId = null,
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
