import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { EntityId } from '../../shared/domain/model/base-entity';
import { BaseApi } from '../../shared/infrastructure/base-api';
import { RouteResource, VehicleResource } from './fleet.resources';

/**
 * Infrastructure gateway for the Fleet bounded context (routes + vehicles).
 */
@Injectable({ providedIn: 'root' })
export class FleetApi extends BaseApi {
  private readonly routes = this.endpoint<RouteResource>(environment.routesEndpointPath);
  private readonly vehicles = this.endpoint<VehicleResource>(environment.vehiclesEndpointPath);

  // ─── Routes ──────────────────────────────────────────────────────────────
  getRoutesByOrganization(organizationId: string | null): Observable<RouteResource[]> {
    return this.routes.getAll({ organizationId });
  }

  createRoute(resource: Omit<RouteResource, 'id'>): Observable<RouteResource> {
    return this.routes.create(resource);
  }

  updateRoute(id: EntityId, resource: Omit<RouteResource, 'id'>): Observable<RouteResource> {
    return this.routes.update(id, resource);
  }

  deleteRoute(id: EntityId): Observable<unknown> {
    return this.routes.delete(id);
  }

  // ─── Vehicles ────────────────────────────────────────────────────────────
  getVehiclesByOrganization(organizationId: string | null): Observable<VehicleResource[]> {
    return this.vehicles.getAll({ organizationId });
  }

  createVehicle(resource: Omit<VehicleResource, 'id'>): Observable<VehicleResource> {
    return this.vehicles.create(resource);
  }

  updateVehicle(id: EntityId, resource: Omit<VehicleResource, 'id'>): Observable<VehicleResource> {
    return this.vehicles.update(id, resource);
  }

  deleteVehicle(id: EntityId): Observable<unknown> {
    return this.vehicles.delete(id);
  }
}
