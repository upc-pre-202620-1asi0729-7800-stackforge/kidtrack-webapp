import { Incident, IncidentSeverity, IncidentStatus, IncidentType } from '../domain/model/incident.entity';
import { Trip, TripStatus, TripType } from '../domain/model/trip.entity';
import { IncidentResource, TripResource } from './trip.resources';

/** Maps trip resources to/from domain entities. */
export class TripAssembler {
    static toEntityFromResource(resource: TripResource): Trip {
        return new Trip({
            ...resource,
            studentIds: resource.studentIds ?? [],
            tripType: (resource.tripType as TripType) || 'OUTBOUND',
            status: (resource.status as TripStatus) || 'SCHEDULED',
            studentsTotal: Number(resource.studentsTotal) || 0,
            studentsBoarded: Number(resource.studentsBoarded) || 0,
        });
    }

    static toEntitiesFromResources(resources: TripResource[]): Trip[] {
        return (resources ?? []).map(r => this.toEntityFromResource(r));
    }

    static toResourceFromEntity(trip: Trip): Omit<TripResource, 'id'> {
        const { id, ...resource } = { ...trip };
        return resource;
    }
}

/** Maps incident resources to/from domain entities. */
export class IncidentAssembler {
    static toEntityFromResource(resource: IncidentResource): Incident {
        return new Incident({
            ...resource,
            type: (resource.type as IncidentType) || 'OTRO',
            severity: (resource.severity as IncidentSeverity) || 'LOW',
            status: (resource.status as IncidentStatus) || 'OPEN',
        });
    }

    static toEntitiesFromResources(resources: IncidentResource[]): Incident[] {
        return (resources ?? []).map(r => this.toEntityFromResource(r));
    }

    static toResourceFromEntity(incident: Incident): Omit<IncidentResource, 'id'> {
        const { id, ...resource } = { ...incident };
        return resource;
    }
}
