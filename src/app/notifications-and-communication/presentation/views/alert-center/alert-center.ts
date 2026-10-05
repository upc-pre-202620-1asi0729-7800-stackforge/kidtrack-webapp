import { Component, OnInit, TemplateRef, computed, inject, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { IamStore } from '../../../../identity-and-access-management/application/iam.store';
import { EntityId } from '../../../../shared/domain/model/base-entity';
import { StakeholderStore } from '../../../../stakeholder-and-asset-management/application/stakeholder.store';
import { TripStore } from '../../../../trip-execution-and-monitoring/application/trip.store';
import {
  INCIDENT_TYPES, Incident, IncidentSeverity, IncidentStatus, IncidentType,
} from '../../../../trip-execution-and-monitoring/domain/model/incident.entity';
import { NotificationStore } from '../../../application/notification.store';
import { Notification } from '../../../domain/model/notification.entity';

type Tab = 'incidents' | 'notifications';

interface IncidentForm { tripId: EntityId | null; type: IncidentType; severity: IncidentSeverity; description: string; }

/**
 * Alert center: trip incidents (with filters / report / resolve) and parent notifications
 * with unread tracking.
 */
@Component({
  selector: 'kt-alert-center',
  imports: [FormsModule, MatButtonModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatSelectModule],
  templateUrl: './alert-center.html',
  styleUrl: './alert-center.css',
})
export class AlertCenter implements OnInit {
  private readonly dialog = inject(MatDialog);
  private readonly iamStore = inject(IamStore);
  private readonly tripStore = inject(TripStore);
  private readonly stakeholderStore = inject(StakeholderStore);
  private readonly notificationStore = inject(NotificationStore);

  private readonly newIncidentTpl = viewChild.required<TemplateRef<unknown>>('newIncidentDialog');
  private dialogRef: MatDialogRef<unknown> | null = null;

  protected readonly incidentTypes = INCIDENT_TYPES;
  protected readonly reportableTypes = INCIDENT_TYPES.slice(1);
  protected readonly severityOptions = [
    { value: 'ALL', label: 'Toda gravedad' }, { value: 'LOW', label: 'Leve' },
    { value: 'MEDIUM', label: 'Moderado' }, { value: 'HIGH', label: 'Grave' },
  ];
  protected readonly statusOptions = [
    { value: 'ALL', label: 'Todos los estados' }, { value: 'OPEN', label: 'Abierto' }, { value: 'RESOLVED', label: 'Resuelto' },
  ];

  protected readonly isAdmin = this.iamStore.isAdmin;
  protected readonly activeTab = signal<Tab>('incidents');
  protected readonly filterStatus = signal<IncidentStatus | 'ALL'>('ALL');
  protected readonly filterSeverity = signal<IncidentSeverity | 'ALL'>('ALL');
  protected readonly filterType = signal<IncidentType | 'ALL'>('ALL');

  protected readonly incidents = this.tripStore.incidents;
  protected readonly trips = this.tripStore.trips;

  protected readonly filteredIncidents = computed(() =>
    this.incidents()
      .filter(i => this.filterStatus() === 'ALL' || i.status === this.filterStatus())
      .filter(i => this.filterSeverity() === 'ALL' || i.severity === this.filterSeverity())
      .filter(i => this.filterType() === 'ALL' || i.type === this.filterType())
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));

  private readonly userParentId = computed(() =>
    this.stakeholderStore.parentByEmail(this.iamStore.currentUser()?.email)?.id ?? null);

  /** Admins see everything; parents see broadcasts and their own notifications. */
  protected readonly visibleNotifs = computed(() =>
    this.notificationStore.notifications()
      .filter(n => this.isAdmin() || n.parentId === null || String(n.parentId) === String(this.userParentId()))
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));

  protected readonly unreadCount = computed(() => this.visibleNotifs().filter(n => !n.read).length);

  protected form: IncidentForm = this.emptyForm();

  ngOnInit(): void {
    const orgId = this.iamStore.organizationId();
    void this.tripStore.loadIncidents(orgId);
    void this.tripStore.loadTrips(orgId);
    void this.notificationStore.loadNotifications(orgId);
    void this.stakeholderStore.loadAll(orgId);
  }

  protected fmt(timestamp: string): string {
    return new Date(timestamp).toLocaleString('es-PE', { dateStyle: 'short', timeStyle: 'short' });
  }

  // ── Notifications ────────────────────────────────────────────────────────
  protected markRead(notification: Notification): void {
    if (!notification.read && notification.id !== null) void this.notificationStore.markAsRead([notification.id]);
  }

  protected markAllRead(): void {
    void this.notificationStore.markAsRead(this.visibleNotifs().filter(n => !n.read && n.id !== null).map(n => n.id!));
  }

  // ── Incidents ────────────────────────────────────────────────────────────
  private emptyForm(): IncidentForm {
    return { tripId: null, type: 'OTRO', severity: 'LOW', description: '' };
  }

  protected openNew(): void {
    this.form = this.emptyForm();
    this.dialogRef = this.dialog.open(this.newIncidentTpl(), { width: '480px', autoFocus: false });
  }

  protected closeDialog(): void {
    this.dialogRef?.close();
  }

  protected async saveIncident(): Promise<void> {
    if (!this.form.description) return;
    const trip = this.trips().find(t => String(t.id) === String(this.form.tripId));
    await this.tripStore.reportIncident(new Incident({
      tripId: this.form.tripId,
      routeId: trip?.routeId ?? null,
      routeName: trip?.routeName ?? '',
      type: this.form.type,
      severity: this.form.severity,
      description: this.form.description,
      reportedBy: String(this.iamStore.currentUser()?.id ?? 'UNKNOWN'),
      organizationId: this.iamStore.organizationId(),
    }));
    this.closeDialog();
  }

  protected resolveIncident(incident: Incident): void {
    if (incident.id !== null) void this.tripStore.resolveIncident(incident.id);
  }
}
