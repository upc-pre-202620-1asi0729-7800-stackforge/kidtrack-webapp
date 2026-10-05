import { BaseEntity, EntityId } from '../../../shared/domain/model/base-entity';

export type TripStatus = 'SCHEDULED' | 'EN_ROUTE' | 'COMPLETED' | 'CANCELLED';
export type TripType = 'OUTBOUND' | 'RETURN';

export interface TripStatusMeta { bg: string; text: string; label: string; icon: string; }

export const TRIP_STATUS_META: Record<TripStatus, TripStatusMeta> = {
    EN_ROUTE: { bg: '#dcfce7', text: '#15803d', label: 'En Ruta', icon: 'pi pi-car' },
    SCHEDULED: { bg: '#fef9c3', text: '#854d0e', label: 'Programado', icon: 'pi pi-clock' },
    COMPLETED: { bg: '#e0f2fe', text: '#0369a1', label: 'Completado', icon: 'pi pi-check-circle' },
    CANCELLED: { bg: '#fee2e2', text: '#DE4A26', label: 'Cancelado', icon: 'pi pi-times-circle' },
};

export function tripStatusMeta(status: string): TripStatusMeta {
    return TRIP_STATUS_META[status as TripStatus] ?? { bg: '#f3f4f6', text: '#6b7280', label: status, icon: 'pi pi-circle' };
}

/**
 * Trip aggregate within the Trip bounded context: the real-time execution of a route.
 */
export class Trip implements BaseEntity {
    id: EntityId | null;
    routeId: EntityId | null;
    routeName: string;
    driverId: string | null;
    driverName: string;
    vehicleId: EntityId | null;
    vehiclePlate: string;
    studentIds: string[];
    tripType: TripType;
    scheduledDate: string;
    scheduledStartTime: string;
    status: TripStatus;
    startTime: string | null;
    endTime: string | null;
    studentsTotal: number;
    studentsBoarded: number;
    currentStop: string | null;
    currentLocation: string | null;
    organizationId: string | null;

    constructor({
                    id = null, routeId = null, routeName = '', driverId = null, driverName = '', vehicleId = null,
                    vehiclePlate = '', studentIds = [], tripType = 'OUTBOUND', scheduledDate = '', scheduledStartTime = '',
                    status = 'SCHEDULED', startTime = null, endTime = null, studentsTotal = 0, studentsBoarded = 0,
                    currentStop = null, currentLocation = null, organizationId = null,
                }: Partial<Trip> = {}) {
        this.id = id;
        this.routeId = routeId;
        this.routeName = routeName;
        this.driverId = driverId;
        this.driverName = driverName;
        this.vehicleId = vehicleId;
        this.vehiclePlate = vehiclePlate;
        this.studentIds = studentIds;
        this.tripType = tripType;
        this.scheduledDate = scheduledDate;
        this.scheduledStartTime = scheduledStartTime;
        this.status = status;
        this.startTime = startTime;
        this.endTime = endTime;
        this.studentsTotal = studentsTotal;
        this.studentsBoarded = studentsBoarded;
        this.currentStop = currentStop;
        this.currentLocation = currentLocation;
        this.organizationId = organizationId;
    }

    get typeLabel(): string {
        return this.tripType === 'RETURN' ? 'Retorno' : 'Recojo';
    }

    get typeClass(): string {
        return this.tripType === 'RETURN' ? 'retorno' : 'recojo';
    }

    get statusMeta(): TripStatusMeta {
        return tripStatusMeta(this.status);
    }

    get displayName(): string {
        return this.routeName || `Viaje #${this.id}`;
    }

    /** Returns a copy with the given changes applied. */
    with(changes: Partial<Trip>): Trip {
        return new Trip({ ...this, ...changes });
    }
}
