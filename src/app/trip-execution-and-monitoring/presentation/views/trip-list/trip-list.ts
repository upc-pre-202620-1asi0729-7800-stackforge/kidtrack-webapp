import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatTableModule } from '@angular/material/table';
import { IamStore } from '../../../../identity-and-access-management/application/iam.store';
import { TripStore } from '../../../application/trip.store';

/** Scheduled and past trips with status badges (drivers see their own). */
@Component({
  selector: 'kt-trip-list',
  imports: [MatPaginatorModule, MatTableModule],
  template: `
    <div class="p-4">
      <h1 class="list-title">Trips</h1>
      <div class="table-card">
        <table mat-table [dataSource]="page()" class="kt-table">
          <ng-container matColumnDef="id">
            <th mat-header-cell *matHeaderCellDef>ID</th>
            <td mat-cell *matCellDef="let t">{{ t.id }}</td>
          </ng-container>
          <ng-container matColumnDef="route">
            <th mat-header-cell *matHeaderCellDef>Route</th>
            <td mat-cell *matCellDef="let t">{{ t.routeName || t.routeId }}</td>
          </ng-container>
          <ng-container matColumnDef="driver">
            <th mat-header-cell *matHeaderCellDef>Driver</th>
            <td mat-cell *matCellDef="let t">{{ t.driverName || t.driverId }}</td>
          </ng-container>
          <ng-container matColumnDef="date">
            <th mat-header-cell *matHeaderCellDef>Date</th>
            <td mat-cell *matCellDef="let t">{{ t.scheduledDate }} {{ t.scheduledStartTime }}</td>
          </ng-container>
          <ng-container matColumnDef="status">
            <th mat-header-cell *matHeaderCellDef>Status</th>
            <td mat-cell *matCellDef="let t">
              <span class="status-badge" [style.background]="t.statusMeta.bg" [style.color]="t.statusMeta.text">{{ t.statusMeta.label }}</span>
            </td>
          </ng-container>
          <ng-container matColumnDef="location">
            <th mat-header-cell *matHeaderCellDef>Location</th>
            <td mat-cell *matCellDef="let t">{{ t.currentLocation }}</td>
          </ng-container>
          <tr mat-header-row *matHeaderRowDef="columns"></tr>
          <tr mat-row *matRowDef="let t; columns: columns"></tr>
        </table>
        <mat-paginator [length]="trips().length" [pageSize]="pageSize()" [pageSizeOptions]="[5, 10, 20]" (page)="onPage($event)"/>
      </div>
    </div>
  `,
  styles: `
    .list-title { font-size: 2rem; margin: 0 0 1rem; color: var(--dark); }
    .table-card { background: #fff; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); overflow-x: auto; }
    .kt-table { width: 100%; min-width: 50rem; }
    .kt-table th { background: #f8f9fa; font-weight: 700; }
    .status-badge { font-size: 0.7rem; font-weight: 700; padding: 2px 8px; border-radius: 20px; white-space: nowrap; }
  `,
})
export class TripList implements OnInit {
  private readonly iamStore = inject(IamStore);
  private readonly store = inject(TripStore);

  protected readonly columns = ['id', 'route', 'driver', 'date', 'status', 'location'];
  protected readonly pageIndex = signal(0);
  protected readonly pageSize = signal(5);

  protected readonly trips = computed(() => {
    const user = this.iamStore.currentUser();
    const all = this.store.trips();
    return user?.roleTier === 'DRIVER' ? all.filter(t => t.driverId === String(user.id)) : all;
  });
  protected readonly page = computed(() =>
    this.trips().slice(this.pageIndex() * this.pageSize(), (this.pageIndex() + 1) * this.pageSize()));

  ngOnInit(): void {
    void this.store.loadTrips(this.iamStore.organizationId());
  }

  protected onPage(event: PageEvent): void {
    this.pageIndex.set(event.pageIndex);
    this.pageSize.set(event.pageSize);
  }
}
