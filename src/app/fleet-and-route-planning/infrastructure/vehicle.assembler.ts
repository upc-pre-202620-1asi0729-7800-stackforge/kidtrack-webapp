import { Vehicle } from '../domain/model/vehicle.entity';
import { VehicleResource } from './fleet.resources';

/** Maps vehicle resources to/from domain entities. */
export class VehicleAssembler {
  static toEntityFromResource(resource: VehicleResource): Vehicle {
    return new Vehicle({
      id: resource.id,
      plate: resource.plate ?? '',
      model: resource.model ?? '',
      capacity: Number(resource.capacity) || 0,
      active: resource.status === 'ACTIVE',
      organizationId: resource.organizationId ?? null,
    });
  }

  static toEntitiesFromResources(resources: VehicleResource[]): Vehicle[] {
    return (resources ?? []).map(r => this.toEntityFromResource(r));
  }

  static toResourceFromEntity(vehicle: Vehicle): Omit<VehicleResource, 'id'> {
    return {
      plate: vehicle.plate,
      model: vehicle.model,
      capacity: vehicle.capacity,
      status: vehicle.active ? 'ACTIVE' : 'INACTIVE',
      organizationId: vehicle.organizationId,
    };
  }
}
