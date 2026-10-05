import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { EntityId } from '../../shared/domain/model/base-entity';
import { Notification } from '../domain/model/notification.entity';
import { NotificationApi } from '../infrastructure/notification-api';
import { NotificationAssembler } from '../infrastructure/notification.assembler';

/**
 * Signal store for the Notifications bounded context: alerts, boarding confirmations
 * and announcements, plus the read/unread state.
 */
@Injectable({ providedIn: 'root' })
export class NotificationStore {
  private readonly api = inject(NotificationApi);

  readonly notifications = signal<Notification[]>([]);
  readonly errors = signal<unknown[]>([]);

  async loadNotifications(organizationId: string | null): Promise<void> {
    try {
      this.notifications.set(NotificationAssembler.toEntitiesFromResources(
        await firstValueFrom(this.api.getNotificationsByOrganization(organizationId)),
      ));
    } catch (error) {
      this.pushError(error);
    }
  }

  async createNotification(notification: Notification): Promise<void> {
    try {
      const created = NotificationAssembler.toEntityFromResource(
        await firstValueFrom(this.api.createNotification(NotificationAssembler.toResourceFromEntity(notification))),
      );
      this.notifications.update(list => [...list, created]);
    } catch (error) {
      this.pushError(error);
    }
  }

  async markAsRead(ids: EntityId[]): Promise<void> {
    for (const id of ids) {
      try {
        const saved = NotificationAssembler.toEntityFromResource(await firstValueFrom(this.api.markAsRead(id)));
        this.notifications.update(list => list.map(n => (String(n.id) === String(saved.id) ? saved : n)));
      } catch (error) {
        this.pushError(error);
      }
    }
  }

  private pushError(error: unknown): void {
    this.errors.update(list => [...list, error]);
  }
}
