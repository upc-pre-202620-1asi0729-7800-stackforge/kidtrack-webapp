import { EntityId } from '../../shared/domain/model/base-entity';

export interface TripResource {
  id: EntityId;
  routeId: EntityId | null;
  routeName: string;
  driverId: string | null;
  driverName: string;
  vehicleId: EntityId | null;
  vehiclePlate: string;
  studentIds: string[];
  tripType: string;
  scheduledDate: string;
  scheduledStartTime: string;
  status: string;
  startTime: string | null;
  endTime: string | null;
  studentsTotal: number;
  studentsBoarded: number;
  currentStop: string | null;
  currentLocation: string | null;
  organizationId: string | null;
}

export interface IncidentResource {
  id: EntityId;
  tripId: EntityId | null;
  routeId: EntityId | null;
  routeName: string;
  type: string;
  severity: string;
  description: string;
  reportedBy: string;
  timestamp: string;
  status: string;
  organizationId: string | null;
}
