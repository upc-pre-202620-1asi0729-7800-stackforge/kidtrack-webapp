import { Route, RouteType } from '../domain/model/route.entity';
import { RouteResource } from './fleet.resources';

/** Maps route resources to/from domain entities. */
export class RouteAssembler {
  static toEntityFromResource(resource: RouteResource): Route {
    return new Route({
      id: resource.id,
      name: resource.name ?? '',
      type: (resource.type as RouteType) || 'OUTBOUND',
      driverId: resource.driverId ?? null,
      driverName: resource.driverName ?? '',
      vehicleId: resource.vehicleId ?? null,
      vehiclePlate: resource.vehiclePlate ?? '',
      studentIds: resource.studentIds ?? [],
      scheduledStartTime: resource.scheduledStartTime ?? '',
      status: resource.status ?? 'ACTIVE',
      organizationId: resource.organizationId ?? null,
      waypoints: [...(resource.waypoints ?? [])]
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
        .map(w => ({ order: w.order, name: w.name, lat: w.lat, lng: w.lng, studentIds: w.studentIds ?? [] })),
    });
  }

  static toEntitiesFromResources(resources: RouteResource[]): Route[] {
    return (resources ?? []).map(r => this.toEntityFromResource(r));
  }

  static toResourceFromEntity(route: Route): Omit<RouteResource, 'id'> {
    return {
      name: route.name,
      type: route.type,
      driverId: route.driverId,
      driverName: route.driverName,
      vehicleId: route.vehicleId,
      vehiclePlate: route.vehiclePlate,
      studentIds: route.studentIds,
      scheduledStartTime: route.scheduledStartTime,
      status: route.status,
      organizationId: route.organizationId,
      waypoints: route.waypoints.map((w, i) => ({ ...w, order: i + 1 })),
    };
  }
}
