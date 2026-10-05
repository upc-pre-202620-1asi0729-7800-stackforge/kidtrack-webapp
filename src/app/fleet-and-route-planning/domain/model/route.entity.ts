import { BaseEntity, EntityId } from '../../../shared/domain/model/base-entity';
import { Waypoint } from './waypoint';

export type RouteType = 'OUTBOUND' | 'RETURN';

/**
 * Route aggregate within the Fleet bounded context: ordered stops (with GPS
 * coordinates and per-stop students), assigned driver/vehicle and departure time.
 */
export class Route implements BaseEntity {
  id: EntityId | null;
  name: string;
  type: RouteType;
  driverId: string | null;
  driverName: string;
  vehicleId: EntityId | null;
  vehiclePlate: string;
  studentIds: string[];
  scheduledStartTime: string;
  status: string;
  organizationId: string | null;
  waypoints: Waypoint[];

  constructor({
    id = null, name = '', type = 'OUTBOUND', driverId = null, driverName = '', vehicleId = null,
    vehiclePlate = '', studentIds = [], scheduledStartTime = '', status = 'ACTIVE',
    organizationId = null, waypoints = [],
  }: Partial<Route> = {}) {
    this.id = id;
    this.name = name;
    this.type = type;
    this.driverId = driverId;
    this.driverName = driverName;
    this.vehicleId = vehicleId;
    this.vehiclePlate = vehiclePlate;
    this.studentIds = studentIds;
    this.scheduledStartTime = scheduledStartTime;
    this.status = status;
    this.organizationId = organizationId;
    this.waypoints = waypoints;
  }

  get origin(): string {
    return this.waypoints[0]?.name ?? '';
  }

  get destination(): string {
    return this.waypoints.length >= 2 ? this.waypoints[this.waypoints.length - 1].name : '';
  }

  get stops(): number {
    return this.waypoints.length;
  }

  /** A route is complete when it can generate a trip: type, driver, vehicle, students, ≥ 2 stops and a departure time. */
  isComplete(): boolean {
    return this.missingRequirements().length === 0;
  }

  missingRequirements(): string[] {
    const missing: string[] = [];
    if (!this.type) missing.push('tipo de ruta');
    if (!this.driverId) missing.push('conductor');
    if (!this.vehicleId) missing.push('vehículo');
    if (!this.studentIds.length) missing.push('estudiantes');
    if (this.waypoints.length < 2) missing.push('mín. 2 paradas');
    if (!this.scheduledStartTime) missing.push('horario de salida');
    return missing;
  }

  /** Deep copy suitable for editing in a form. */
  clone(): Route {
    return new Route({
      ...this,
      studentIds: [...this.studentIds],
      waypoints: this.waypoints.map(w => ({ ...w, studentIds: [...(w.studentIds ?? [])] })),
    });
  }
}
