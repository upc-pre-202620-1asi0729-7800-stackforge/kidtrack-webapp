import { EntityId } from '../../shared/domain/model/base-entity';

export interface ParentResource {
  id: EntityId;
  name: string;
  email: string;
  phone: string;
  status: boolean;
  organizationId: string | null;
}

export interface ChildResource {
  id: EntityId;
  name: string;
  grade: string;
  parentId: EntityId | null;
  status: boolean;
  boardingStatus: string;
  hasPhoto?: boolean;
  organizationId: string | null;
}

export interface ProfileResource {
  id: EntityId;
  userId: string | null;
  firstName: string;
  lastName: string;
  phone: string;
  role: 'driver' | 'parent';
  license?: string;
  vehicleId?: EntityId | null;
  status: string;
  organizationId: string | null;
}
