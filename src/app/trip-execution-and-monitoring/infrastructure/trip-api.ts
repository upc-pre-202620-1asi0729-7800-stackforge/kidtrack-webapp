import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { EntityId } from '../../shared/domain/model/base-entity';
import { BaseApi } from '../../shared/infrastructure/base-api';
import { IncidentResource, TripResource } from './trip.resources';

/**
 * Trip API Service: trip lifecycle, boarding progress and incident reports.
 */
@Injectable({ providedIn: 'root' })
export class TripApi extends BaseApi {
  private readonly trips = this.endpoint<TripResource>(environment.tripsEndpointPath);
  private readonly incidents = this.endpoint<IncidentResource>(environment.incidentsEndpointPath);

  // ─── Trips ───────────────────────────────────────────────────────────────
  getTripsByOrganization(organizationId: string | null): Observable<TripResource[]> {
    return this.trips.getAll({ organizationId });
  }

  createTrip(resource: Omit<TripResource, 'id'>): Observable<TripResource> {
    return this.trips.create(resource);
  }

  patchTrip(id: EntityId, partial: Partial<TripResource>): Observable<TripResource> {
    return this.trips.patch(id, partial);
  }

  deleteTrip(id: EntityId): Observable<unknown> {
    return this.trips.delete(id);
  }

  // ─── Incidents ───────────────────────────────────────────────────────────
  getIncidentsByOrganization(organizationId: string | null): Observable<IncidentResource[]> {
    return this.incidents.getAll({ organizationId });
  }

  reportIncident(resource: Omit<IncidentResource, 'id'>): Observable<IncidentResource> {
    return this.incidents.create(resource);
  }

  patchIncident(id: EntityId, partial: Partial<IncidentResource>): Observable<IncidentResource> {
    return this.incidents.patch(id, partial);
  }
}
