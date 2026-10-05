import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { EntityId } from '../../shared/domain/model/base-entity';
import { BaseApi } from '../../shared/infrastructure/base-api';
import { NotificationResource } from './notification.resources';

/**
 * Infrastructure gateway for the Notifications bounded context.
 */
@Injectable({ providedIn: 'root' })
export class NotificationApi extends BaseApi {
  private readonly notifications = this.endpoint<NotificationResource>(environment.notificationsEndpointPath);

  getNotificationsByOrganization(organizationId: string | null): Observable<NotificationResource[]> {
    return this.notifications.getAll({ organizationId });
  }

  createNotification(resource: Omit<NotificationResource, 'id'>): Observable<NotificationResource> {
    return this.notifications.create(resource);
  }

  markAsRead(id: EntityId): Observable<NotificationResource> {
    return this.notifications.patch(id, { read: true });
  }
}
