import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { EntityId } from '../../shared/domain/model/base-entity';
import { BaseApi } from '../../shared/infrastructure/base-api';
import { OrganizationResource, SignInResponse, SignUpRequest, UserResource } from './iam.resources';

/**
 * Infrastructure gateway for IAM bounded-context endpoints.
 */
@Injectable({ providedIn: 'root' })
export class IamApi extends BaseApi {
  private readonly users = this.endpoint<UserResource & { password?: string }>(environment.usersEndpointPath);
  private readonly organizations = this.endpoint<OrganizationResource>(environment.organizationsEndpointPath);

  // ─── Authentication ──────────────────────────────────────────────────────
  signIn(email: string, password: string): Observable<SignInResponse> {
    return this.http.post<SignInResponse>(this.url(environment.signInEndpointPath), { email, password });
  }

  signUp(request: SignUpRequest): Observable<UserResource> {
    return this.http.post<UserResource>(this.url(environment.signUpEndpointPath), request);
  }

  // ─── Users ───────────────────────────────────────────────────────────────
  getUsersByOrganization(organizationId: string): Observable<UserResource[]> {
    return this.users.getAll({ organizationId });
  }

  patchUser(id: EntityId, partial: Partial<UserResource & { password: string }>): Observable<UserResource> {
    return this.users.patch(id, partial);
  }

  // ─── Organizations ───────────────────────────────────────────────────────
  createOrganization(request: Partial<OrganizationResource>): Observable<OrganizationResource> {
    return this.organizations.create(request);
  }

  getOrganizationById(id: EntityId): Observable<OrganizationResource> {
    return this.organizations.getById(id);
  }

  patchOrganization(id: EntityId, partial: Partial<OrganizationResource>): Observable<OrganizationResource> {
    return this.organizations.patch(id, partial);
  }
}
