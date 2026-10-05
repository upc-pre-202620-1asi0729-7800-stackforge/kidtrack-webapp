import { EntityId } from '../../shared/domain/model/base-entity';

export interface UserResource {
  id: EntityId;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  roleTier: string;
  organizationId: string | null;
}

export interface SignInResponse extends UserResource {
  token: string;
}

export interface SignUpRequest {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  roleTier: string;
  organizationId: string | null;
}

export interface OrganizationResource {
  id: EntityId;
  name: string;
  status: string;
  createdAt: string | null;
}
