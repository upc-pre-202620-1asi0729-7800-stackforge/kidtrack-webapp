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
  emergencyType?: string | null;
  serviceName?: string | null;
  servicePhone?: string | null;
  location?: string | null;
  studentIds?: string[];
  studentsSafe?: boolean | null;
  serviceContactedAt?: string | null;
  serviceContactedBy?: string | null;
  resolution?: string | null;
  resolvedAt?: string | null;
  updates?: { message: string; sentAt: string; author: string }[];
}

export interface HandoverResource {
  id: EntityId;
  tripId: EntityId | null;
  childId: EntityId | null;
  childName: string;
  authorizedPersonId: EntityId | null;
  receiverName: string;
  relationship: string;
  outcome: string;
  recordedBy: string;
  recordedAt: string;
  organizationId: string | null;
}

/** A `null` authorized person means that nobody registered was there to receive the student. */
export interface HandoverRequest {
  tripId: EntityId;
  childId: EntityId;
  authorizedPersonId: EntityId | null;
  receiverName?: string;
}
