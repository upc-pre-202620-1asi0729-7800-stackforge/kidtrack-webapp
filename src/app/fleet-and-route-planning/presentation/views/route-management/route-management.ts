import {
  AfterViewInit, ChangeDetectorRef, Component, OnDestroy, TemplateRef, computed, inject, signal, viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import * as L from 'leaflet';
import { IamStore } from '../../../../identity-and-access-management/application/iam.store';
import { ConfirmService } from '../../../../shared/application/confirm.service';
import { ToastService } from '../../../../shared/application/toast.service';
import { Coordinates } from '../../../../shared/domain/model/coordinates';
import { TranslatePipe } from '../../../../shared/i18n/translate.pipe';
import { LIMA, MapService } from '../../../../shared/infrastructure/map.service';
import { StakeholderStore } from '../../../../stakeholder-and-asset-management/application/stakeholder.store';
import { SubscriptionStore } from '../../../../subscription-and-plan-management/application/subscription.store';
import { TripStore } from '../../../../trip-execution-and-monitoring/application/trip.store';
import { FleetStore } from '../../../application/fleet.store';
import { Route, RouteType } from '../../../domain/model/route.entity';
import { Waypoint } from '../../../domain/model/waypoint';

interface Option { label: string; value: string; }

const TYPE_OPTIONS: { label: string; value: RouteType }[] = [
  { label: 'Recojo (Ida — mañana)', value: 'OUTBOUND' },
  { label: 'Retorno (Vuelta — tarde)', value: 'RETURN' },
];

const distance = (a: Waypoint, b: Waypoint) => new Coordinates(a.lat, a.lng).distanceTo(new Coordinates(b.lat, b.lng));

@Component({
  selector: 'kt-route-management',
  imports: [FormsModule, MatButtonModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatTooltipModule, TranslatePipe],
  templateUrl: './route-management.html',
  styleUrl: './route-management.css',
})
export class RouteManagement implements AfterViewInit, OnDestroy {
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly dialog = inject(MatDialog);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);
  private readonly mapService = inject(MapService);
  private readonly iamStore = inject(IamStore);
  private readonly fleetStore = inject(FleetStore);
  private readonly stakeholderStore = inject(StakeholderStore);
  private readonly subscriptionStore = inject(SubscriptionStore);
  private readonly tripStore = inject(TripStore);

  private readonly routeDialogTpl = viewChild.required<TemplateRef<unknown>>('routeDialog');
  private dialogRef: MatDialogRef<unknown> | null = null;

  protected readonly typeOptions = TYPE_OPTIONS;
  protected readonly isDriver = computed(() => this.iamStore.currentUser()?.roleTier === 'DRIVER');
  private readonly userId = computed(() => String(this.iamStore.currentUser()?.id ?? ''));

  // ── Reference data ───────────────────────────────────────────────────────
  protected readonly driverOptions = computed<Option[]>(() =>
    this.stakeholderStore.activeDrivers().map(d => ({ label: d.fullName, value: d.assignmentId })));
  protected readonly vehicleOptions = computed<Option[]>(() =>
    this.fleetStore.activeVehicles().map(v => ({ label: v.label, value: String(v.id) })));
  protected readonly studentOptions = computed<Option[]>(() =>
    this.stakeholderStore.activeChildren().map(c => ({ label: `${c.name} (${c.grade})`, value: String(c.id) })));

  // ── Route state ──────────────────────────────────────────────────────────
  /** DRIVER only sees their own routes; ADMIN sees all. */
  protected readonly routes = computed(() => {
    const all = this.fleetStore.routes();
    return this.isDriver() ? all.filter(r => r.driverId === this.userId()) : all;
  });
  protected readonly selected = signal<Route | null>(null);
  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly isEdit = signal(false);
  protected readonly previewOrsLoading = signal(false);
  protected readonly formOrsLoading = signal(false);
  protected form: Route = this.emptyForm();

  // ── Maps ─────────────────────────────────────────────────────────────────
  private map: L.Map | null = null;
  private previewLayers: L.Layer[] = [];
  private formMap: L.Map | null = null;
  private formMarkers: L.Marker[] = [];
  private formPolyline: L.Polyline | null = null;

  async ngAfterViewInit(): Promise<void> {
    const orgId = this.iamStore.organizationId();
    this.loading.set(true);
    void this.stakeholderStore.loadAll(orgId);
    void this.fleetStore.loadVehicles(orgId);
    await this.fleetStore.loadRoutes(orgId);
    this.loading.set(false);

    this.map = this.mapService.createMap('route-map');
    const first = this.routes()[0];
    if (first) this.selectRoute(first);

    void this.subscriptionStore.ensureLoaded(orgId);
  }

  ngOnDestroy(): void {
    this.map?.remove();
    this.map = null;
    this.destroyFormMap();
    this.dialogRef?.close();
  }

  // ─────────────────────────────────────────────────────────────
  //  PREVIEW MAP (main panel — shows the selected route)
  // ─────────────────────────────────────────────────────────────
  protected selectRoute(route: Route): void {
    this.selected.set(route);
    void this.showRouteOnMap(route);
  }

  private clearPreview(): void {
    this.previewLayers.forEach(l => this.map?.removeLayer(l));
    this.previewLayers = [];
  }

  private async showRouteOnMap(route: Route): Promise<void> {
    const map = this.map;
    if (!map) return;
    this.clearPreview();
    const wps = route.waypoints;
    if (!wps.length) { map.setView(LIMA, 12); return; }

    const coords = wps.map(w => [w.lat, w.lng] as L.LatLngTuple);
    wps.forEach((wp, i) => {
      this.previewLayers.push(
        L.marker(coords[i], { icon: this.mapService.stopIcon(i + 1, i === 0, i === wps.length - 1) })
          .addTo(map)
          .bindPopup(`<b>Parada ${i + 1}</b><br>${wp.name}`),
      );
    });
    if (coords.length === 1) { map.setView(coords[0], 14); return; }

    const placeholder = L.polyline(coords, { color: '#E07A2B', weight: 4, opacity: 0.4, dashArray: '6 6' }).addTo(map);
    this.previewLayers.push(placeholder);
    map.fitBounds(placeholder.getBounds(), { padding: [40, 40] });

    this.previewOrsLoading.set(true);
    try {
      const { path } = await this.mapService.fetchRoadRoute(wps);
      if (this.selected() !== route || !this.map) return;
      map.removeLayer(placeholder);
      this.previewLayers = this.previewLayers.filter(l => l !== placeholder);
      const road = L.polyline(path, { color: '#E07A2B', weight: 4, opacity: 0.85 }).addTo(map);
      this.previewLayers.push(road);
      map.fitBounds(road.getBounds(), { padding: [40, 40] });
    } catch (error) {
      console.warn('ORS preview failed, keeping straight line:', error);
      this.toast.add({ severity: 'error', summary: 'Ruta no transitable', detail: 'No es posible trazar vía terrestre entre estas paradas.', life: 4000 });
    } finally {
      this.previewOrsLoading.set(false);
    }
  }

  // ─────────────────────────────────────────────────────────────
  //  FORM MAP (inside the dialog — interactive stop placement)
  // ─────────────────────────────────────────────────────────────
  private initFormMap(): void {
    if (this.formMap) return;
    const map = this.mapService.createMap('form-map', LIMA, 12, { zoomControl: true });
    this.formMap = map;
    map.on('click', (e: L.LeafletMouseEvent) => {
      const order = this.form.waypoints.length + 1;
      this.form.waypoints.push({
        order,
        name: order === 1 ? 'Origen' : `Parada ${order}`,
        lat: parseFloat(e.latlng.lat.toFixed(6)),
        lng: parseFloat(e.latlng.lng.toFixed(6)),
        studentIds: [],
      });
      void this.rebuildFormMap();
    });
    if (this.form.waypoints.length) void this.rebuildFormMap();
    setTimeout(() => this.formMap?.invalidateSize(), 50);
    setTimeout(() => this.formMap?.invalidateSize(), 400);
  }

  private destroyFormMap(): void {
    this.formMap?.remove();
    this.formMap = null;
    this.formMarkers = [];
    this.formPolyline = null;
  }

  private async rebuildFormMap(): Promise<void> {
    const map = this.formMap;
    this.cdr.markForCheck();
    if (!map) return;
    this.formMarkers.forEach(m => map.removeLayer(m));
    this.formMarkers = [];
    if (this.formPolyline) { map.removeLayer(this.formPolyline); this.formPolyline = null; }

    const wps = this.form.waypoints;
    if (!wps.length) return;
    const coords = wps.map(w => [w.lat, w.lng] as L.LatLngTuple);

    wps.forEach((wp, i) => {
      const marker = L.marker(coords[i], { icon: this.mapService.stopIcon(i + 1, i === 0, i === wps.length - 1), draggable: true })
        .addTo(map)
        .bindTooltip(wp.name || `Parada ${i + 1}`, { permanent: true, direction: 'top', offset: [0, -14] });
      marker.on('dragend', () => {
        const latlng = marker.getLatLng();
        wps[i].lat = parseFloat(latlng.lat.toFixed(6));
        wps[i].lng = parseFloat(latlng.lng.toFixed(6));
        void this.rebuildFormMap();
      });
      this.formMarkers.push(marker);
    });
    if (coords.length < 2) return;

    this.formPolyline = L.polyline(coords, { color: '#E07A2B', weight: 4, opacity: 0.35, dashArray: '8 6' }).addTo(map);
    map.fitBounds(this.formPolyline.getBounds(), { padding: [60, 60] });

    this.formOrsLoading.set(true);
    try {
      const { path } = await this.mapService.fetchRoadRoute(wps);
      if (!this.formMap) return;
      if (this.formPolyline) map.removeLayer(this.formPolyline);
      this.formPolyline = L.polyline(path, { color: '#E07A2B', weight: 4, opacity: 0.9 }).addTo(map);
      map.fitBounds(this.formPolyline.getBounds(), { padding: [60, 60] });
    } catch (error) {
      console.warn('ORS form route failed, keeping straight line:', error);
      this.toast.add({ severity: 'error', summary: 'Ruta no transitable', detail: 'No es posible trazar vía terrestre entre estas paradas.', life: 4000 });
    } finally {
      this.formOrsLoading.set(false);
    }
  }

  // ─────────────────────────────────────────────────────────────
  //  WAYPOINT HELPERS
  // ─────────────────────────────────────────────────────────────
  protected removeWaypoint(index: number): void {
    this.form.waypoints.splice(index, 1);
    this.form.waypoints.forEach((w, i) => (w.order = i + 1));
    this.syncStudents();
    void this.rebuildFormMap();
  }

  protected clearWaypoints(): void {
    this.form.waypoints = [];
    this.syncStudents();
    void this.rebuildFormMap();
  }

  protected onWaypointNameChange(): void {
    void this.rebuildFormMap();
  }

  protected isStudentAtStop(wp: Waypoint, studentId: string): boolean {
    return wp.studentIds.includes(studentId);
  }

  protected toggleStudent(wp: Waypoint, studentId: string): void {
    wp.studentIds = wp.studentIds.includes(studentId)
      ? wp.studentIds.filter(id => id !== studentId)
      : [...wp.studentIds, studentId];
    this.syncStudents();
  }

  /** Route students = union of every stop's students. */
  private syncStudents(): void {
    this.form.studentIds = [...new Set(this.form.waypoints.flatMap(w => w.studentIds))];
  }

  /** US-5.S2 — Nearest-neighbor TSP over the intermediate stops (origin and destination stay fixed). */
  protected optimizeWaypoints(): void {
    const wps = this.form.waypoints;
    if (wps.length < 3) {
      this.toast.add({ severity: 'info', summary: 'Se necesitan al menos 3 paradas', detail: 'Agrega más paradas para optimizar el orden.' });
      return;
    }
    const origin = wps[0];
    const destination = wps[wps.length - 1];
    const unvisited = wps.slice(1, -1);
    const ordered: Waypoint[] = [];
    let current = origin;
    while (unvisited.length) {
      let best = 0;
      unvisited.forEach((wp, i) => { if (distance(current, wp) < distance(current, unvisited[best])) best = i; });
      current = unvisited.splice(best, 1)[0];
      ordered.push(current);
    }
    this.form.waypoints = [origin, ...ordered, destination].map((w, i) => ({ ...w, order: i + 1 }));
    void this.rebuildFormMap();
    this.toast.add({ severity: 'success', summary: '¡Ruta optimizada!', detail: `${ordered.length} paradas reordenadas con el camino más corto.`, life: 3500 });
  }

  // ─────────────────────────────────────────────────────────────
  //  DIALOG + CRUD
  // ─────────────────────────────────────────────────────────────
  private emptyForm(): Route {
    return new Route({ organizationId: this.iamStore.organizationId() });
  }

  protected openCreate(): void {
    const plan = this.subscriptionStore.currentPlan();
    if (plan && this.routes().length >= plan.maxRoutes) {
      this.toast.add({ severity: 'error', summary: 'Límite alcanzado', detail: `Tu plan ${plan.name} permite un máximo de ${plan.maxRoutes} rutas.`, life: 5000 });
      return;
    }
    this.isEdit.set(false);
    this.form = this.emptyForm();
    if (this.isDriver()) {
      const me = this.driverOptions().find(d => d.value === this.userId());
      if (me) { this.form.driverId = me.value; this.form.driverName = me.label; }
    }
    this.openDialog();
  }

  protected openEdit(route: Route, event?: Event): void {
    event?.stopPropagation();
    this.isEdit.set(true);
    this.form = route.clone();
    this.openDialog();
  }

  private openDialog(): void {
    this.dialogRef = this.dialog.open(this.routeDialogTpl(), {
      width: '96vw', maxWidth: '1600px', panelClass: 'route-dialog-panel', autoFocus: false, disableClose: true,
    });
    this.dialogRef.afterOpened().subscribe(() => setTimeout(() => this.initFormMap(), 250));
    this.dialogRef.afterClosed().subscribe(() => { this.destroyFormMap(); this.dialogRef = null; });
  }

  protected closeDialog(): void {
    this.dialogRef?.close();
  }

  protected onDriverChange(driverId: string): void {
    this.form.driverId = driverId;
    this.form.driverName = this.driverOptions().find(o => o.value === driverId)?.label ?? '';
  }

  protected onVehicleChange(vehicleId: string): void {
    this.form.vehicleId = vehicleId;
    this.form.vehiclePlate = this.fleetStore.vehicles().find(v => String(v.id) === vehicleId)?.plate ?? '';
  }

  protected selectedVehicleValue(): string | null {
    return this.form.vehicleId === null ? null : String(this.form.vehicleId);
  }

  protected async saveRoute(): Promise<void> {
    if (!this.form.name) return;
    const form = this.form;
    const conflict = this.routes().some(r =>
      r.driverId === form.driverId && r.scheduledStartTime === form.scheduledStartTime && String(r.id) !== String(form.id));
    if (conflict) {
      this.toast.add({ severity: 'error', summary: 'Conductor ocupado', detail: 'El conductor ya tiene una ruta asignada en este mismo horario.', life: 4000 });
      return;
    }

    this.saving.set(true);
    try {
      const saved = await this.fleetStore.saveRoute(form);
      if (!saved) {
        this.toast.add({ severity: 'error', summary: 'Error', detail: 'No se pudo guardar la ruta.' });
        return;
      }
      this.selectRoute(saved);
      this.toast.add({ severity: 'success', summary: this.isEdit() ? 'Ruta actualizada' : 'Ruta creada', detail: saved.name });
      this.toast.add({ severity: 'info', summary: 'Alerta enviada', detail: 'Se notificó al conductor de su asignación.', life: 4000 });

      // Auto-generate today's trip when the route is complete.
      if (saved.isComplete()) {
        const result = await this.tripStore.autoCreateTripForRoute(saved);
        if (result.status === 'created') {
          this.toast.add({ severity: 'info', summary: '¡Viaje programado!', detail: `Se generó un viaje SCHEDULED para hoy a las ${saved.scheduledStartTime}.`, life: 5000 });
        } else if (result.status === 'duplicate') {
          this.toast.add({ severity: 'warn', summary: 'Viaje ya existe', detail: `Ya hay un viaje programado para esta ruta hoy a las ${saved.scheduledStartTime}.`, life: 4000 });
        } else if (result.status === 'conflict') {
          this.toast.add({ severity: 'error', summary: 'Conflicto de horario', detail: 'El conductor o vehículo ya tienen otro viaje activo en ese horario.', life: 5000 });
        }
      }
      this.closeDialog();
    } finally {
      this.saving.set(false);
    }
  }

  protected deleteRoute(route: Route, event: Event): void {
    event.stopPropagation();
    this.confirm.require({
      message: `¿Eliminar la ruta ${route.name}?`,
      header: 'Confirmar eliminación',
      icon: 'pi pi-exclamation-triangle',
      acceptSeverity: 'danger',
      accept: async () => {
        if (!(await this.fleetStore.deleteRoute(route.id!))) return;
        if (this.selected() === route) { this.selected.set(null); this.clearPreview(); }
      },
    });
  }

  // ── Display helpers ──────────────────────────────────────────────────────
  protected typeLabel(type: string): string {
    return type === 'OUTBOUND' ? 'Recojo' : type === 'RETURN' ? 'Retorno' : type;
  }

  protected typeClass(type: string): string {
    return type === 'OUTBOUND' ? 'outbound' : 'return';
  }

  protected stopColor(index: number, total: number): string {
    return index === 0 ? '#16a34a' : index === total - 1 ? '#DE4A26' : '#1E3A63';
  }
}
