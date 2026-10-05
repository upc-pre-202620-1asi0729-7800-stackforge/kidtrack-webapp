import { EntityId } from '../../shared/domain/model/base-entity';

export interface NotificationResource {
  id: EntityId;
  type: string;
  message: string;
  timestamp: string;
  read: boolean;
  parentId: EntityId | null;
  tripId: EntityId | null;
  organizationId: string | null;
}
