import { EntityId } from '../../shared/domain/model/base-entity';

export interface WaypointResource {
  order: number;
  name: string;
  lat: number;
  lng: number;
  studentIds?: string[];
}

export interface RouteResource {
  id: EntityId;
  name: string;
  type: string;
  driverId: string | null;
  driverName: string;
  vehicleId: EntityId | null;
  vehiclePlate: string;
  studentIds: string[];
  scheduledStartTime: string;
  status: string;
  organizationId: string | null;
  waypoints: WaypointResource[];
}

export interface VehicleResource {
  id: EntityId;
  plate: string;
  model: string;
  capacity: number;
  status: string;
  organizationId: string | null;
}
