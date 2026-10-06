import { Notification, NotificationType } from '../domain/model/notification.entity';
import { NotificationResource } from './notification.resources';

/** Maps notification resources to/from domain entities. */
export class NotificationAssembler {
  static toEntityFromResource(resource: NotificationResource): Notification {
    return new Notification({ ...resource, type: resource.type as NotificationType, read: !!resource.read });
  }

  static toEntitiesFromResources(resources: NotificationResource[]): Notification[] {
    return (resources ?? []).map(r => this.toEntityFromResource(r));
  }

  static toResourceFromEntity(notification: Notification): Omit<NotificationResource, 'id'> {
    const { id, ...resource } = { ...notification };
    return resource;
  }
}
