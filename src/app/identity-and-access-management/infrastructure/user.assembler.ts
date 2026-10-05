import { RoleTier, User } from '../domain/model/user.entity';
import { UserResource } from './iam.resources';

/** Maps user resources into domain entities. */
export class UserAssembler {
  static toEntityFromResource(resource: UserResource): User {
    return new User({
      id: resource.id,
      firstName: resource.firstName ?? '',
      lastName: resource.lastName ?? '',
      email: resource.email ?? '',
      phone: resource.phone ?? '',
      roleTier: (resource.roleTier as RoleTier) ?? '',
      organizationId: resource.organizationId ?? null,
    });
  }

  static toEntitiesFromResources(resources: UserResource[]): User[] {
    return (resources ?? []).map(r => this.toEntityFromResource(r));
  }

  static toResourceFromEntity(user: User): Partial<UserResource> {
    return {
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone,
      roleTier: user.roleTier,
      organizationId: user.organizationId,
    };
  }
}
