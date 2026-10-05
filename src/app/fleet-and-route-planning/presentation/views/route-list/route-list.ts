import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatTableModule } from '@angular/material/table';
import { IamStore } from '../../../../identity-and-access-management/application/iam.store';
import { FleetStore } from '../../../application/fleet.store';

/** Read-only table of the routes visible to the signed-in user (drivers see their own). */
@Component({
  selector: 'kt-route-list',
  imports: [MatButtonModule, MatPaginatorModule, MatTableModule],
  template: `
    <div class="p-4">
      <h1 class="list-title">Routes</h1>
      <div class="table-card">
        <table mat-table [dataSource]="page()" class="kt-table">
          <ng-container matColumnDef="id">
            <th mat-header-cell *matHeaderCellDef>ID</th>
            <td mat-cell *matCellDef="let r">{{ r.id }}</td>
          </ng-container>
          <ng-container matColumnDef="name">
            <th mat-header-cell *matHeaderCellDef>Name</th>
            <td mat-cell *matCellDef="let r">{{ r.name }}</td>
          </ng-container>
          <ng-container matColumnDef="origin">
            <th mat-header-cell *matHeaderCellDef>Origin</th>
            <td mat-cell *matCellDef="let r">{{ r.origin }}</td>
          </ng-container>
          <ng-container matColumnDef="destination">
            <th mat-header-cell *matHeaderCellDef>Destination</th>
            <td mat-cell *matCellDef="let r">{{ r.destination }}</td>
          </ng-container>
          <ng-container matColumnDef="schedule">
            <th mat-header-cell *matHeaderCellDef>Schedule</th>
            <td mat-cell *matCellDef="let r">{{ r.scheduledStartTime }}</td>
          </ng-container>
          <tr mat-header-row *matHeaderRowDef="columns"></tr>
          <tr mat-row *matRowDef="let r; columns: columns"></tr>
        </table>
        @if (!store.routesLoaded()) { <p class="state-msg"><i class="pi pi-spin pi-spinner"></i></p> }
        <mat-paginator [length]="routes().length" [pageSize]="pageSize()" [pageSizeOptions]="[5, 10, 20]" (page)="onPage($event)"/>
      </div>
    </div>
  `,
  styles: `
    .list-title { font-size: 2rem; margin: 0 0 1rem; color: var(--dark); }
    .table-card { background: #fff; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); overflow-x: auto; }
    .kt-table { width: 100%; min-width: 50rem; }
    .kt-table th { background: #f8f9fa; font-weight: 700; }
    .state-msg { text-align: center; padding: 1rem; color: var(--muted); }
  `,
})
export class RouteList implements OnInit {
  private readonly iamStore = inject(IamStore);
  protected readonly store = inject(FleetStore);

  protected readonly columns = ['id', 'name', 'origin', 'destination', 'schedule'];
  protected readonly pageIndex = signal(0);
  protected readonly pageSize = signal(5);

  protected readonly routes = computed(() => {
    const user = this.iamStore.currentUser();
    const all = this.store.routes();
    return user?.roleTier === 'DRIVER' ? all.filter(r => r.driverId === String(user.id)) : all;
  });
  protected readonly page = computed(() =>
    this.routes().slice(this.pageIndex() * this.pageSize(), (this.pageIndex() + 1) * this.pageSize()));

  ngOnInit(): void {
    void this.store.loadRoutes(this.iamStore.organizationId());
  }

  protected onPage(event: PageEvent): void {
    this.pageIndex.set(event.pageIndex);
    this.pageSize.set(event.pageSize);
  }
}
