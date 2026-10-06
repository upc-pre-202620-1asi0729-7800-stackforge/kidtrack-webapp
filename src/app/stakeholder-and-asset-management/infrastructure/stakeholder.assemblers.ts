import { FullName } from '../../shared/domain/model/full-name';
import { BoardingStatus, Child } from '../domain/model/child.entity';
import { Driver } from '../domain/model/driver.entity';
import { Parent } from '../domain/model/parent.entity';
import { ChildResource, ParentResource, ProfileResource } from './stakeholder.resources';

/** Maps parent resources to/from domain entities. */
export class ParentAssembler {
  static toEntityFromResource(resource: ParentResource): Parent {
    return new Parent({
      id: resource.id, name: resource.name ?? '', email: resource.email ?? '', phone: resource.phone ?? '',
      active: resource.status !== false, organizationId: resource.organizationId ?? null,
    });
  }

  static toEntitiesFromResources(resources: ParentResource[]): Parent[] {
    return (resources ?? []).map(r => this.toEntityFromResource(r));
  }

  static toResourceFromEntity(parent: Parent): Omit<ParentResource, 'id'> {
    return { name: parent.name, email: parent.email, phone: parent.phone, status: parent.active, organizationId: parent.organizationId };
  }
}

/** Maps child resources to/from domain entities. */
export class ChildAssembler {
  static toEntityFromResource(resource: ChildResource): Child {
    return new Child({
      id: resource.id, name: resource.name ?? '', grade: resource.grade ?? '', parentId: resource.parentId ?? null,
      active: resource.status !== false, boardingStatus: (resource.boardingStatus as BoardingStatus) || 'EN_ESPERA',
      hasPhoto: !!resource.hasPhoto, organizationId: resource.organizationId ?? null,
    });
  }

  static toEntitiesFromResources(resources: ChildResource[]): Child[] {
    return (resources ?? []).map(r => this.toEntityFromResource(r));
  }

  static toResourceFromEntity(child: Child): Omit<ChildResource, 'id'> {
    return {
      name: child.name, grade: child.grade, parentId: child.parentId, status: child.active,
      boardingStatus: child.boardingStatus, hasPhoto: child.hasPhoto, organizationId: child.organizationId,
    };
  }
}

/** Maps "driver" profile resources to/from Driver entities. */
export class DriverAssembler {
  static toEntityFromResource(resource: ProfileResource): Driver {
    return new Driver({
      id: resource.id,
      userId: resource.userId ?? null,
      fullName: new FullName(resource.firstName, resource.lastName).getFullName(),
      phone: resource.phone ?? '',
      licenseNumber: resource.license ?? '',
      vehicleId: resource.vehicleId ?? null,
      active: resource.status === 'ACTIVE',
      organizationId: resource.organizationId ?? null,
    });
  }

  static toEntitiesFromResources(resources: ProfileResource[]): Driver[] {
    return (resources ?? []).map(r => this.toEntityFromResource(r));
  }

  static toResourceFromEntity(driver: Driver): Omit<ProfileResource, 'id'> {
    const name = FullName.fromText(driver.fullName);
    return {
      userId: driver.userId,
      firstName: name.firstName,
      lastName: name.lastName,
      phone: driver.phone,
      role: 'driver',
      license: driver.licenseNumber,
      vehicleId: driver.vehicleId,
      status: driver.active ? 'ACTIVE' : 'INACTIVE',
      organizationId: driver.organizationId,
    };
  }
}
