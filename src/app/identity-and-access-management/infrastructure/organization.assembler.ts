import { Organization, OrganizationStatus } from '../domain/model/organization.entity';
import { OrganizationResource } from './iam.resources';

/** Maps organization resources into domain entities. */
export class OrganizationAssembler {
  static toEntityFromResource(resource: OrganizationResource): Organization {
    return new Organization({
      id: resource.id,
      name: resource.name ?? '',
      status: (resource.status as OrganizationStatus) ?? 'ACTIVE',
      createdAt: resource.createdAt ?? null,
    });
  }

  static toResourceFromEntity(organization: Organization): Partial<OrganizationResource> {
    return { name: organization.name, status: organization.status, createdAt: organization.createdAt };
  }
}
