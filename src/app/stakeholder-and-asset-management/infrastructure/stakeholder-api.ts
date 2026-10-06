import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { EntityId } from '../../shared/domain/model/base-entity';
import { BaseApi } from '../../shared/infrastructure/base-api';
import { ChildResource, ParentResource, ProfileResource } from './stakeholder.resources';

/**
 * Infrastructure gateway for the Stakeholder bounded context.
 */
@Injectable({ providedIn: 'root' })
export class StakeholderApi extends BaseApi {
  private readonly parents = this.endpoint<ParentResource>(environment.parentsEndpointPath);
  private readonly children = this.endpoint<ChildResource>(environment.childrenEndpointPath);
  private readonly profiles = this.endpoint<ProfileResource>(environment.profilesEndpointPath);

  // ─── Parents ─────────────────────────────────────────────────────────────
  getParentsByOrganization(organizationId: string | null): Observable<ParentResource[]> {
    return this.parents.getAll({ organizationId });
  }
  createParent(resource: Omit<ParentResource, 'id'>): Observable<ParentResource> {
    return this.parents.create(resource);
  }
  updateParent(id: EntityId, resource: Omit<ParentResource, 'id'>): Observable<ParentResource> {
    return this.parents.update(id, resource);
  }
  deleteParent(id: EntityId): Observable<unknown> {
    return this.parents.delete(id);
  }

  // ─── Children ────────────────────────────────────────────────────────────
  getChildrenByOrganization(organizationId: string | null): Observable<ChildResource[]> {
    return this.children.getAll({ organizationId });
  }
  createChild(resource: Omit<ChildResource, 'id'>): Observable<ChildResource> {
    return this.children.create(resource);
  }
  updateChild(id: EntityId, resource: Omit<ChildResource, 'id'>): Observable<ChildResource> {
    return this.children.update(id, resource);
  }
  patchChild(id: EntityId, partial: Partial<ChildResource>): Observable<ChildResource> {
    return this.children.patch(id, partial);
  }
  deleteChild(id: EntityId): Observable<unknown> {
    return this.children.delete(id);
  }

  // ─── Drivers (profiles with role=driver) ────────────────────────────────
  getDriversByOrganization(organizationId: string | null): Observable<ProfileResource[]> {
    return this.profiles.getAll({ organizationId, role: 'driver' });
  }
  createDriver(resource: Omit<ProfileResource, 'id'>): Observable<ProfileResource> {
    return this.profiles.create(resource);
  }
  updateDriver(id: EntityId, resource: Omit<ProfileResource, 'id'>): Observable<ProfileResource> {
    return this.profiles.update(id, resource);
  }
  deleteDriver(id: EntityId): Observable<unknown> {
    return this.profiles.delete(id);
  }
}
