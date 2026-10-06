import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { EntityId } from '../../shared/domain/model/base-entity';
import { Route } from '../domain/model/route.entity';
import { Vehicle } from '../domain/model/vehicle.entity';
import { FleetApi } from '../infrastructure/fleet-api';
import { RouteAssembler } from '../infrastructure/route.assembler';
import { VehicleAssembler } from '../infrastructure/vehicle.assembler';

/**
 * Route Signal Store: route configuration (stops, driver, vehicle, schedule) and the
 * organization's fleet, synchronized with the web service.
 */
@Injectable({ providedIn: 'root' })
export class FleetStore {
  private readonly api = inject(FleetApi);

  readonly routes = signal<Route[]>([]);
  readonly vehicles = signal<Vehicle[]>([]);
  readonly routesLoaded = signal(false);
  readonly loading = signal(false);
  readonly errors = signal<unknown[]>([]);

  readonly activeVehicles = computed(() => this.vehicles().filter(v => v.active));

  // ─── Routes ──────────────────────────────────────────────────────────────

  async loadRoutes(organizationId: string | null): Promise<Route[]> {
    this.loading.set(true);
    try {
      const routes = RouteAssembler.toEntitiesFromResources(await firstValueFrom(this.api.getRoutesByOrganization(organizationId)));
      this.routes.set(routes);
      this.routesLoaded.set(true);
      return routes;
    } catch (error) {
      this.pushError(error);
      return [];
    } finally {
      this.loading.set(false);
    }
  }

  /** Creates or updates a route (depending on whether it has an id). */
  async saveRoute(route: Route): Promise<Route | null> {
    try {
      const resource = RouteAssembler.toResourceFromEntity(route);
      const saved = RouteAssembler.toEntityFromResource(await firstValueFrom(
        route.id === null ? this.api.createRoute(resource) : this.api.updateRoute(route.id, resource),
      ));
      this.routes.update(list =>
        route.id === null ? [...list, saved] : list.map(r => (String(r.id) === String(saved.id) ? saved : r)),
      );
      return saved;
    } catch (error) {
      this.pushError(error);
      return null;
    }
  }

  async deleteRoute(id: EntityId): Promise<boolean> {
    try {
      await firstValueFrom(this.api.deleteRoute(id));
      this.routes.update(list => list.filter(r => String(r.id) !== String(id)));
      return true;
    } catch (error) {
      this.pushError(error);
      return false;
    }
  }

  // ─── Vehicles ────────────────────────────────────────────────────────────

  async loadVehicles(organizationId: string | null): Promise<void> {
    try {
      this.vehicles.set(VehicleAssembler.toEntitiesFromResources(await firstValueFrom(this.api.getVehiclesByOrganization(organizationId))));
    } catch (error) {
      this.pushError(error);
    }
  }

  async saveVehicle(vehicle: Vehicle): Promise<Vehicle | null> {
    try {
      const resource = VehicleAssembler.toResourceFromEntity(vehicle);
      const saved = VehicleAssembler.toEntityFromResource(await firstValueFrom(
        vehicle.id === null ? this.api.createVehicle(resource) : this.api.updateVehicle(vehicle.id, resource),
      ));
      this.vehicles.update(list =>
        vehicle.id === null ? [...list, saved] : list.map(v => (String(v.id) === String(saved.id) ? saved : v)),
      );
      return saved;
    } catch (error) {
      this.pushError(error);
      return null;
    }
  }

  async deleteVehicle(id: EntityId): Promise<boolean> {
    try {
      await firstValueFrom(this.api.deleteVehicle(id));
      this.vehicles.update(list => list.filter(v => String(v.id) !== String(id)));
      return true;
    } catch (error) {
      this.pushError(error);
      return false;
    }
  }

  private pushError(error: unknown): void {
    this.errors.update(list => [...list, error]);
  }
}
