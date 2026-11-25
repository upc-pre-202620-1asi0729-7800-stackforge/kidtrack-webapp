import { AfterViewInit, Component, OnDestroy, TemplateRef, computed, inject, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import * as L from 'leaflet';
import { environment } from '../../../../../environments/environment';
import { FleetStore } from '../../../../fleet-and-route-planning/application/fleet.store';
import { Waypoint } from '../../../../fleet-and-route-planning/domain/model/waypoint';
import { IamStore } from '../../../../identity-and-access-management/application/iam.store';
import { NotificationStore } from '../../../../notifications-and-communication/application/notification.store';
import { Notification } from '../../../../notifications-and-communication/domain/model/notification.entity';
import { ConfirmService } from '../../../../shared/application/confirm.service';
import { ToastService } from '../../../../shared/application/toast.service';
import { LIMA, LatLngTuple, MapService } from '../../../../shared/infrastructure/map.service';
import { StakeholderStore } from '../../../../stakeholder-and-asset-management/application/stakeholder.store';
import { TripStore } from '../../../application/trip.store';
import { EMERGENCY_TYPES, EmergencyType, Incident } from '../../../domain/model/incident.entity';
import { Trip, tripStatusMeta } from '../../../domain/model/trip.entity';
import { BoardingScanner, BoardingScannerData } from '../../components/boarding-scanner/boarding-scanner';
import { EmergencyPanel } from '../../components/emergency-panel/emergency-panel';

type BoardingMark = 'ABORDADO' | 'AUSENTE';

const STEP_MS = environment.simulationStepMs || 2000;
const SOS_HOLD_MS = 3000;
const REFRESH_MS = 10000;
/** Value of the delivery dialog when the person at the stop is not registered. */
const NOT_REGISTERED = 'NOT_REGISTERED';

// Inline SVG car icon — no font dependency, always renders
const CAR_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="#1a1a2e" style="display:block">
  <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.85 7h10.29l1.04 3H5.81l1.04-3zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/>
</svg>`;

const BUS_ICON = L.divIcon({
  html: `
    <div class="at-bus-wrap" style="position:relative;width:44px;height:44px;box-sizing:border-box">
      <div class="at-bus-pulse" style="position:absolute;top:4px;left:4px;width:36px;height:36px;border-radius:50%;background:#E07A2B;opacity:0;pointer-events:none;z-index:1"></div>
      <div class="at-bus-body" style="position:absolute;top:4px;left:4px;width:36px;height:36px;background:#E07A2B;border:3px solid #fff;border-radius:50%;box-shadow:0 3px 10px rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;box-sizing:border-box;z-index:2">
        ${CAR_SVG}
      </div>
    </div>`,
  className: 'at-bus-marker', iconSize: [44, 44], iconAnchor: [22, 22],
});

/** Compass bearing (0 = N, 90 = E) between two [lat, lng] points. */
function bearing(a: LatLngTuple, b: LatLngTuple): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLng = toRad(b[1] - a[1]);
  const φ1 = toRad(a[0]);
  const φ2 = toRad(b[0]);
  const y = Math.sin(dLng) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(dLng);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

/**
 * Driver's real-time operational view: active route on the map, stop progress,
 * student boarding checklist (manual + QR), delivery to registered persons, SOS emergencies
 * and trip lifecycle.
 */
@Component({
  selector: 'kt-active-trip',
  imports: [FormsModule, MatButtonModule, MatCheckboxModule, MatDialogModule, EmergencyPanel],
  templateUrl: './active-trip.html',
  styleUrl: './active-trip.css',
})
export class ActiveTrip implements AfterViewInit, OnDestroy {
  private readonly dialog = inject(MatDialog);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);
  private readonly mapService = inject(MapService);
  private readonly iamStore = inject(IamStore);
  private readonly tripStore = inject(TripStore);
  private readonly fleetStore = inject(FleetStore);
  private readonly stakeholderStore = inject(StakeholderStore);
  private readonly notificationStore = inject(NotificationStore);

  private readonly checklistTpl = viewChild.required<TemplateRef<unknown>>('checklistDialog');
  private checklistRef: MatDialogRef<unknown> | null = null;
  private readonly handoverTpl = viewChild.required<TemplateRef<unknown>>('handoverDialog');
  private handoverRef: MatDialogRef<unknown> | null = null;
  private readonly emergencyTpl = viewChild.required<TemplateRef<unknown>>('emergencyDialog');
  private emergencyRef: MatDialogRef<unknown> | null = null;

  // ── State ────────────────────────────────────────────────────────────────
  protected readonly loading = signal(true);
  protected readonly tripData = signal<Trip | null>(null);
  protected readonly simRunning = signal(false);
  protected readonly currentWpIdx = signal(-1);
  protected readonly isOffline = signal(!navigator.onLine);
  protected readonly orsLoading = signal(false);
  protected readonly boardingState = signal<Record<string, BoardingMark>>({});

  /** DRIVER only sees their own trips; others see all. */
  protected readonly allTrips = computed(() => {
    const user = this.iamStore.currentUser();
    const trips = this.tripStore.trips();
    return user?.roleTier === 'DRIVER' ? trips.filter(t => t.driverId === String(user.id)) : trips;
  });
  protected readonly routeData = computed(() => {
    const trip = this.tripData();
    return trip ? this.fleetStore.routes().find(r => String(r.id) === String(trip.routeId)) ?? null : null;
  });
  protected readonly waypoints = computed<Waypoint[]>(() => this.routeData()?.waypoints ?? []);
  protected readonly stops = computed(() =>
    this.waypoints().map((wp, i) => ({ ...wp, done: i < this.currentWpIdx(), current: i === this.currentWpIdx() })));
  protected readonly progress = computed(() => {
    const n = this.waypoints().length;
    return n ? Math.round((Math.max(0, this.currentWpIdx()) / n) * 100) : 0;
  });
  protected readonly tripStatus = computed(() => this.tripData()?.status ?? 'SCHEDULED');
  protected readonly isScheduled = computed(() => this.tripStatus() === 'SCHEDULED');
  protected readonly isEnRoute = computed(() => this.tripStatus() === 'EN_ROUTE');
  protected readonly isCompleted = computed(() => this.tripStatus() === 'COMPLETED');
  protected readonly statusMeta = computed(() => tripStatusMeta(this.tripStatus()));

  protected readonly boardingStudents = computed(() => {
    const ids = this.tripData()?.studentIds ?? [];
    const marks = this.boardingState();
    return this.stakeholderStore.children()
      .filter(c => ids.includes(String(c.id)))
      .map(c => ({
        id: String(c.id), name: c.name, parentId: c.parentId, mark: marks[String(c.id)] ?? null,
        handover: this.tripStore.handoverOf(this.tripData()?.id, c.id!),
      }));
  });
  protected readonly boardedCount = computed(() => Object.values(this.boardingState()).filter(s => s === 'ABORDADO').length);

  // ── US17 — Pre-trip security checklist ───────────────────────────────────
  protected checklist = [
    { id: 'luces', label: 'Luces delanteras y traseras', icon: 'pi pi-sun', checked: false },
    { id: 'frenos', label: 'Sistema de frenos operativo', icon: 'pi pi-stop-circle', checked: false },
    { id: 'cinturones', label: 'Cinturones de seguridad', icon: 'pi pi-link', checked: false },
    { id: 'documentos', label: 'Documentos del vehículo', icon: 'pi pi-file', checked: false },
    { id: 'extintor', label: 'Extintor vigente', icon: 'pi pi-shield', checked: false },
  ];

  // ── Delivery: only a registered person may receive a student ─────────────
  protected readonly notRegistered = NOT_REGISTERED;
  protected handoverChild: { id: string; name: string } | null = null;
  protected receiverChoice = '';
  protected unknownReceiverName = '';
  protected readonly saving = signal(false);

  // ── US13 — SOS panic button and force majeure emergencies ────────────────
  protected readonly emergencyTypes = EMERGENCY_TYPES;
  protected readonly sosHolding = signal(false);
  protected readonly sosProgress = signal(0);
  protected readonly openEmergency = computed(() => this.tripStore.openEmergencyOf(this.tripData()?.id));
  protected emergencyForm = this.emptyEmergencyForm();
  private sosTimer: ReturnType<typeof setTimeout> | undefined;
  private sosProgressTimer: ReturnType<typeof setInterval> | undefined;
  private refreshTimer: ReturnType<typeof setInterval> | undefined;

  // ── Map / simulation internals ───────────────────────────────────────────
  private map: L.Map | null = null;
  private busMarker: L.Marker | null = null;
  private routeLine: L.Polyline | null = null;
  private stopCircles: L.CircleMarker[] = [];
  private roadPath: LatLngTuple[] = [];
  private wpIndices: number[] = [];
  private animFrame: ReturnType<typeof setTimeout> | undefined;
  private subStepTimer: ReturnType<typeof setInterval> | undefined;

  private readonly onOffline = () => {
    this.isOffline.set(true);
    this.toast.add({ severity: 'error', summary: 'Sin conexión', detail: 'Modo Offline: reconectando...', life: 5000 });
  };
  private readonly onOnline = () => {
    this.isOffline.set(false);
    this.toast.add({ severity: 'success', summary: 'Conectado', detail: 'Conexión restaurada.' });
  };

  async ngAfterViewInit(): Promise<void> {
    const orgId = this.iamStore.organizationId();
    await Promise.all([
      this.tripStore.loadTrips(orgId),
      this.fleetStore.loadRoutes(orgId),
      this.stakeholderStore.loadAll(orgId),
      this.stakeholderStore.loadAuthorizedPersons(orgId),
      this.tripStore.loadHandovers(orgId),
      this.tripStore.loadIncidents(orgId),
    ]);
    // The administrator may add news or close an emergency while the driver is on this screen.
    this.refreshTimer = setInterval(() => void this.tripStore.loadIncidents(orgId), REFRESH_MS);
    this.loading.set(false);
    // The map container is rendered once loading is false.
    setTimeout(async () => {
      this.injectMapStyles();
      this.map = this.mapService.createMap('active-trip-map');
      const trips = this.allTrips();
      const auto = trips.find(t => t.status === 'EN_ROUTE') ?? trips.find(t => t.status === 'SCHEDULED') ?? trips[0];
      if (auto) await this.selectTrip(auto);
    });
    window.addEventListener('offline', this.onOffline);
    window.addEventListener('online', this.onOnline);
  }

  ngOnDestroy(): void {
    window.removeEventListener('offline', this.onOffline);
    window.removeEventListener('online', this.onOnline);
    this.pauseSim();
    clearTimeout(this.sosTimer);
    clearInterval(this.sosProgressTimer);
    clearInterval(this.refreshTimer);
    this.checklistRef?.close();
    this.handoverRef?.close();
    this.emergencyRef?.close();
    this.map?.remove();
    this.map = null;
  }

  // ── Display helpers ──────────────────────────────────────────────────────
  protected metaOf(trip: Trip) { return trip.statusMeta; }
  protected isSelected(trip: Trip): boolean { return String(this.tripData()?.id) === String(trip.id); }
  protected statusPillClass(): string { return this.tripStatus().toLowerCase().replace('_', '-'); }

  // ── Map ──────────────────────────────────────────────────────────────────
  private injectMapStyles(): void {
    if (document.getElementById('at-bus-styles')) return;
    const style = document.createElement('style');
    style.id = 'at-bus-styles';
    style.textContent = `
      @keyframes atPulse { 0% { transform: scale(1); opacity: 0.7; } 100% { transform: scale(2.4); opacity: 0; } }
      @keyframes atBounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-3px); } }
      .leaflet-marker-icon.at-bus-marker { background: transparent !important; border: none !important; width: 44px !important; height: 44px !important; }
      .at-bus-wrap         { transition: transform 0.15s linear; }
      .at-bus-pulse.active { animation: atPulse 1.2s ease-out infinite; }
      .at-bus-body.moving  { animation: atBounce 0.32s ease-in-out infinite; }
    `;
    document.head.appendChild(style);
  }

  private stopColor(i: number): string {
    const idx = this.currentWpIdx();
    return i < idx ? '#22c55e' : i === idx ? '#1E3A63' : '#94a3b8';
  }

  private clearMapLayers(): void {
    const map = this.map;
    if (!map) return;
    if (this.routeLine) { map.removeLayer(this.routeLine); this.routeLine = null; }
    this.stopCircles.forEach(c => map.removeLayer(c));
    this.stopCircles = [];
    if (this.busMarker) { map.removeLayer(this.busMarker); this.busMarker = null; }
  }

  private buildMapLayer(): void {
    const map = this.map;
    if (!map) return;
    this.clearMapLayers();
    const wps = this.waypoints();
    if (!wps.length) { map.setView(LIMA, 12); return; }

    const path = this.roadPath.length > 1 ? this.roadPath : wps.map(w => [w.lat, w.lng] as LatLngTuple);
    this.routeLine = L.polyline(path, { color: '#1E3A63', weight: 5, opacity: 0.85 }).addTo(map);
    map.fitBounds(this.routeLine.getBounds(), { padding: [40, 40] });

    wps.forEach((wp, i) => {
      this.stopCircles.push(
        L.circleMarker([wp.lat, wp.lng], { radius: 8, fillColor: this.stopColor(i), color: '#fff', weight: 2, fillOpacity: 1 })
          .addTo(map)
          .bindTooltip(`${i + 1}. ${wp.name}`, { direction: 'top' }),
      );
    });
  }

  private refreshStopColors(): void {
    this.stopCircles.forEach((c, i) => c.setStyle({ fillColor: this.stopColor(i) }));
  }

  private placeBusAt(position: LatLngTuple): void {
    const map = this.map;
    if (!map) return;
    if (!this.busMarker) {
      this.busMarker = L.marker(position, { icon: BUS_ICON, zIndexOffset: 1000 })
        .addTo(map)
        .bindPopup(`🚌 ${this.tripData()?.driverName || 'Conductor'}`);
    } else {
      this.busMarker.setLatLng(position);
    }
  }

  private rotateBus(degrees: number): void {
    const wrap = this.busMarker?.getElement()?.querySelector<HTMLElement>('.at-bus-wrap');
    if (wrap) wrap.style.transform = `rotate(${degrees - 90}deg)`;
  }

  private setBusMoving(moving: boolean): void {
    const el = this.busMarker?.getElement();
    el?.querySelector('.at-bus-pulse')?.classList.toggle('active', moving);
    el?.querySelector('.at-bus-body')?.classList.toggle('moving', moving);
  }

  private async loadRoadRoute(): Promise<void> {
    const wps = this.waypoints();
    const straight = () => {
      this.roadPath = wps.map(w => [w.lat, w.lng] as LatLngTuple);
      this.wpIndices = wps.map((_, i) => i);
    };
    if (wps.length < 2) { straight(); return; }
    this.orsLoading.set(true);
    try {
      const result = await this.mapService.fetchRoadRoute(wps);
      this.roadPath = result.path;
      this.wpIndices = result.wayPointIndices;
    } catch (error) {
      console.warn('ORS failed, using straight lines:', error);
      straight();
    } finally {
      this.orsLoading.set(false);
    }
  }

  // ── Simulation ───────────────────────────────────────────────────────────

  /** Animates the bus through a segment of road coordinates at ~30 fps over STEP_MS. */
  private animateSegment(segment: LatLngTuple[], onDone: () => void): void {
    if (!segment.length) { onDone(); return; }
    const frameMs = 1000 / 30;
    const stride = (segment.length - 1) / Math.ceil(STEP_MS / frameMs);
    let progress = 0;

    this.setBusMoving(true);
    clearInterval(this.subStepTimer);
    this.subStepTimer = setInterval(() => {
      progress += stride;
      if (progress >= segment.length - 1) {
        clearInterval(this.subStepTimer);
        this.subStepTimer = undefined;
        this.busMarker?.setLatLng(segment[segment.length - 1]);
        this.setBusMoving(false);
        onDone();
        return;
      }
      const idx = Math.floor(progress);
      const t = progress - idx;
      const a = segment[idx];
      const b = segment[Math.min(idx + 1, segment.length - 1)];
      this.busMarker?.setLatLng([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
      this.rotateBus(bearing(a, b));
    }, frameMs);
  }

  private getSegment(fromIdx: number, toIdx: number): LatLngTuple[] {
    const path = this.roadPath;
    const a = this.wpIndices[fromIdx] ?? 0;
    const b = this.wpIndices[toIdx] ?? path.length - 1;
    return path.length > 1 ? path.slice(a, b + 1) : [];
  }

  private onSegmentArrival(wpIdx: number): void {
    this.currentWpIdx.set(wpIdx);
    this.refreshStopColors();
    const wps = this.waypoints();
    const wp = wps[wpIdx];
    const n = wps.length;
    const trip = this.tripData();
    if (wp && trip?.id !== null && trip) {
      this.tripData.set(trip.with({ currentStop: wp.name }));
      void this.tripStore.updateTrip(trip.id!, { currentStop: wp.name, currentLocation: wp.name });
    }
    if (wp) this.map?.panTo([wp.lat, wp.lng], { animate: true, duration: 0.3 });

    if (wpIdx > 0 && trip?.tripType === 'RETURN') {
      this.toast.add({ severity: 'info', summary: 'Parada de entrega', detail: `${wp?.name}: registra quién recibe a cada alumno.`, life: 5000 });
    }
    if (n > 0 && wpIdx === n - 2) {
      this.toast.add({ severity: 'warn', summary: '¡El bus está por llegar!', detail: `Próxima y última parada: ${wps[n - 1]?.name}. ¡Prepárate!`, life: 6000 });
    }
    if (n > 0 && wpIdx === n - 1) {
      this.toast.add({ severity: 'success', summary: '¡Destino alcanzado!', detail: `El bus llegó a ${wp?.name}.`, life: 5000 });
    }
  }

  private scheduleNext(): void {
    clearTimeout(this.animFrame);
    this.animFrame = setTimeout(() => {
      if (!this.simRunning()) return;
      const next = this.currentWpIdx() + 1;
      if (next >= this.waypoints().length) { this.simRunning.set(false); return; }
      this.animateSegment(this.getSegment(this.currentWpIdx(), next), () => {
        this.onSegmentArrival(next);
        if (this.simRunning()) this.scheduleNext();
      });
    }, 400); // brief pause at each stop
  }

  protected startSim(): void {
    if (!this.isEnRoute() || !this.waypoints().length) return;
    if (this.orsLoading()) {
      this.toast.add({ severity: 'warn', summary: 'Calculando ruta…', detail: 'Espera un momento.', life: 2000 });
      return;
    }
    this.simRunning.set(true);
    this.scheduleNext();
  }

  protected pauseSim(): void {
    this.simRunning.set(false);
    clearTimeout(this.animFrame);
    clearInterval(this.subStepTimer);
    this.subStepTimer = undefined;
    this.setBusMoving(false);
  }

  protected resetSim(): void {
    this.pauseSim();
    this.currentWpIdx.set(0);
    const wps = this.waypoints();
    if (!wps.length) return;
    this.refreshStopColors();
    const pos = this.roadPath.length > 1 ? this.roadPath[this.wpIndices[0] ?? 0] : ([wps[0].lat, wps[0].lng] as LatLngTuple);
    this.placeBusAt(pos);
    this.rotateBus(90);
    this.map?.panTo(pos, { animate: true, duration: 0.4 });
    this.toast.add({ severity: 'info', summary: 'Simulación reiniciada', detail: 'El bus volvió a la parada inicial.', life: 2500 });
  }

  protected goToStop(i: number): void {
    if (i <= this.currentWpIdx() || !this.isEnRoute()) return;
    this.pauseSim();
    this.animateSegment(this.getSegment(this.currentWpIdx(), i), () => this.onSegmentArrival(i));
  }

  // ── Trip lifecycle ───────────────────────────────────────────────────────
  protected async selectTrip(trip: Trip): Promise<void> {
    if (this.isSelected(trip) && this.map && this.busMarker) return;
    this.pauseSim();
    this.boardingState.set({});
    this.tripData.set(trip);
    this.roadPath = [];
    this.wpIndices = [];

    const wps = this.waypoints();
    if (trip.status === 'EN_ROUTE' && wps.length) {
      const idx = trip.currentStop ? wps.findIndex(w => w.name === trip.currentStop) : 0;
      this.currentWpIdx.set(idx >= 0 ? idx : 0);
    } else if (trip.status === 'COMPLETED') {
      this.currentWpIdx.set(Math.max(0, wps.length - 1));
    } else {
      this.currentWpIdx.set(-1);
    }

    // Straight-line layer first, then upgrade to real road geometry.
    this.buildMapLayer();
    const busIdx = Math.max(0, this.currentWpIdx());
    if (wps.length) this.placeBusAt([wps[busIdx].lat, wps[busIdx].lng]);

    if (wps.length >= 2) {
      await this.loadRoadRoute();
      if (!this.isSelected(trip)) return;
      this.buildMapLayer();
      const pos = this.roadPath[this.wpIndices[busIdx] ?? 0] ?? ([wps[busIdx].lat, wps[busIdx].lng] as LatLngTuple);
      this.placeBusAt(pos);
    }
  }

  private async startTrip(): Promise<void> {
    const trip = this.tripData();
    if (!trip?.id) return;
    const firstStop = this.waypoints()[0]?.name ?? null;
    const updated = await this.tripStore.updateTrip(trip.id, {
      status: 'EN_ROUTE', startTime: new Date().toISOString(), currentStop: firstStop,
    });
    if (!updated) {
      this.toast.add({ severity: 'error', summary: 'Error', detail: 'No se pudo iniciar el viaje.' });
      return;
    }
    this.tripData.set(updated);
    this.currentWpIdx.set(0);
    const first = this.waypoints()[0];
    if (first) this.placeBusAt([first.lat, first.lng]);
    this.refreshStopColors();
    this.toast.add({ severity: 'info', summary: 'Viaje iniciado', detail: `Ruta: ${updated.routeName}` });
  }

  protected finishTrip(): void {
    if (this.openEmergency()) {
      this.toast.add({ severity: 'warn', summary: 'Emergencia en curso', detail: 'El administrador debe cerrarla antes de finalizar el viaje.', life: 5000 });
      return;
    }
    const pending = this.tripData()?.tripType === 'RETURN'
      ? this.boardingStudents().filter(s => s.mark !== 'AUSENTE' && !s.handover)
      : [];
    if (pending.length) {
      this.toast.add({ severity: 'warn', summary: 'Falta registrar la entrega', detail: `Indica quién recibe a: ${pending.map(s => s.name).join(', ')}.`, life: 6000 });
      return;
    }
    const lastIdx = this.waypoints().length - 1;
    const notFinished = this.currentWpIdx() < lastIdx;
    this.confirm.require({
      message: notFinished
        ? '⚠️ Hay alumnos a bordo (no has completado todas las paradas). ¿Forzar finalización?'
        : '¿Confirmas la finalización del viaje? Se registrará como completado.',
      header: 'Finalizar Viaje',
      icon: 'pi pi-flag-fill',
      acceptLabel: 'Sí, finalizar',
      rejectLabel: 'Cancelar',
      accept: async () => {
        this.pauseSim();
        const trip = this.tripData();
        if (!trip?.id) return;
        const last = this.waypoints()[lastIdx];
        const updated = await this.tripStore.updateTrip(trip.id, {
          status: 'COMPLETED',
          endTime: new Date().toISOString(),
          studentsBoarded: trip.studentsTotal,
          currentStop: null,
          currentLocation: last?.name ?? trip.currentLocation,
        });
        if (!updated) return;
        this.tripData.set(updated);
        this.currentWpIdx.set(lastIdx);
        if (last) this.placeBusAt([last.lat, last.lng]);
        this.refreshStopColors();
        const notDelivered = this.boardingStudents().filter(s => s.handover && !s.handover.delivered);
        this.toast.add(notDelivered.length
          ? { severity: 'warn', summary: 'Viaje finalizado', detail: `No entregados: ${notDelivered.map(s => s.name).join(', ')}. Sus padres fueron avisados.`, life: 6000 }
          : { severity: 'success', summary: '¡Viaje finalizado!', detail: 'Puedes seleccionar otro viaje.', life: 5000 });
      },
    });
  }

  // ── US17 — Checklist dialog ──────────────────────────────────────────────
  protected checklistComplete(): boolean {
    return this.checklist.every(c => c.checked);
  }

  protected openChecklist(): void {
    this.checklist.forEach(c => (c.checked = false));
    this.checklistRef = this.dialog.open(this.checklistTpl(), { width: '420px', disableClose: true, autoFocus: false });
  }

  protected closeChecklist(): void {
    this.checklistRef?.close();
  }

  protected async confirmChecklist(): Promise<void> {
    this.closeChecklist();
    await this.startTrip();
  }

  // ── US13 — SOS (hold 3 s) ────────────────────────────────────────────────
  protected sosStart(event?: Event): void {
    event?.preventDefault();
    if (this.openEmergency()) return;
    this.sosHolding.set(true);
    this.sosProgress.set(0);
    const t0 = Date.now();
    this.sosProgressTimer = setInterval(() => this.sosProgress.set(Math.min(100, ((Date.now() - t0) / SOS_HOLD_MS) * 100)), 40);
    this.sosTimer = setTimeout(() => this.openEmergencyDialog(), SOS_HOLD_MS);
  }

  protected sosEnd(event?: Event): void {
    event?.preventDefault();
    if (!this.sosHolding()) return;
    clearTimeout(this.sosTimer);
    clearInterval(this.sosProgressTimer);
    const cancelled = this.sosProgress() < 66;
    this.sosHolding.set(false);
    this.sosProgress.set(0);
    if (cancelled) this.toast.add({ severity: 'info', summary: 'Cancelado', detail: 'Mantén 3 segundos para activar el SOS.', life: 2000 });
  }

  private emptyEmergencyForm() {
    return {
      type: null as EmergencyType | null,
      location: '',
      detail: '',
      studentsState: 'UNKNOWN' as 'UNKNOWN' | 'SAFE' | 'NEEDS_CARE',
      aboard: {} as Record<string, boolean>,
    };
  }

  private openEmergencyDialog(): void {
    clearInterval(this.sosProgressTimer);
    this.sosHolding.set(false);
    this.sosProgress.set(0);
    this.pauseSim();
    const wp = this.waypoints()[Math.max(0, this.currentWpIdx())];
    // Students marked as aboard; when none is marked, everyone who is not absent. Delivered ones are left out.
    const remaining = this.boardingStudents().filter(s => !s.handover?.delivered && s.mark !== 'AUSENTE');
    const marked = remaining.filter(s => s.mark === 'ABORDADO');
    this.emergencyForm = this.emptyEmergencyForm();
    this.emergencyForm.location = wp?.name ?? this.tripData()?.currentStop ?? '';
    for (const student of marked.length ? marked : remaining) this.emergencyForm.aboard[student.id] = true;
    this.emergencyRef = this.dialog.open(this.emergencyTpl(), { width: '480px', disableClose: true, autoFocus: false });
  }

  protected closeEmergencyDialog(): void {
    this.emergencyRef?.close();
  }

  protected hasStudentsAboard(): boolean {
    return Object.values(this.emergencyForm.aboard).some(Boolean);
  }

  protected async declareEmergency(): Promise<void> {
    const trip = this.tripData();
    const form = this.emergencyForm;
    const type = this.emergencyTypes.find(t => t.value === form.type);
    if (!trip?.id || !type || !this.hasStudentsAboard()) return;
    const user = this.iamStore.currentUser();
    this.saving.set(true);
    const created = await this.tripStore.reportIncident(new Incident({
      tripId: trip.id,
      routeId: trip.routeId,
      routeName: trip.routeName,
      type: 'EMERGENCIA',
      severity: 'HIGH',
      description: form.detail.trim() || `SOS activado por ${user?.firstName || 'el conductor'}: ${type.label}.`,
      reportedBy: user ? `${user.firstName} ${user.lastName}`.trim() : 'Conductor',
      organizationId: this.iamStore.organizationId(),
      emergencyType: type.value,
      location: form.location.trim(),
      studentIds: Object.keys(form.aboard).filter(id => form.aboard[id]),
      studentsSafe: form.studentsState === 'UNKNOWN' ? null : form.studentsState === 'SAFE',
    }));
    this.saving.set(false);
    if (!created) {
      this.toast.add({ severity: 'error', summary: 'No se envió la alerta', detail: `Intenta de nuevo y llama a ${type.service} (${type.phone}).`, life: 10000 });
      return;
    }
    this.closeEmergencyDialog();
    this.toast.add({ severity: 'error', summary: '🚨 Emergencia reportada', detail: `Se avisó a la central y a los padres. Llama a ${type.service} (${type.phone}).`, life: 10000 });
  }

  protected sosDashOffset(): number {
    return 100 - this.sosProgress();
  }

  // ── US16 — Navigation ────────────────────────────────────────────────────
  protected openNavigation(): void {
    const wps = this.waypoints();
    const dest = wps[Math.min(this.currentWpIdx() + 1, wps.length - 1)] ?? wps[0];
    if (!dest) return;
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${dest.lat},${dest.lng}&travelmode=driving`, '_blank');
    this.toast.add({ severity: 'info', summary: 'Abriendo Google Maps', detail: `Navegando hacia: ${dest.name}`, life: 2500 });
  }

  // ── US11 — Boarding (manual + QR) ────────────────────────────────────────
  protected async markBoarding(childId: string, status: BoardingMark): Promise<void> {
    this.boardingState.update(state => ({ ...state, [childId]: status }));
    const trip = this.tripData();
    if (trip?.id) {
      const updated = await this.tripStore.updateTrip(trip.id, { studentsBoarded: this.boardedCount() });
      if (updated) this.tripData.set(updated);
    }
    const child = this.boardingStudents().find(c => c.id === childId);
    void this.stakeholderStore.updateBoardingStatus(childId, status);
    // US-11.S1 — notify the guardian.
    if (child?.parentId !== null && child?.parentId !== undefined) {
      const stop = trip?.currentStop ?? this.waypoints()[Math.max(0, this.currentWpIdx())]?.name ?? '';
      void this.notificationStore.createNotification(new Notification({
        type: status === 'ABORDADO' ? 'ABORDAJE' : 'AUSENCIA',
        message: status === 'ABORDADO'
          ? `${child.name} abordó la unidad${stop ? ` en ${stop}` : ''}`
          : `${child.name} fue marcado como AUSENTE${stop ? ` en la parada ${stop}` : ''}`,
        parentId: child.parentId,
        tripId: trip?.id ?? null,
        organizationId: this.iamStore.organizationId(),
      }));
    }
    this.toast.add({
      severity: status === 'ABORDADO' ? 'success' : 'warn',
      summary: status === 'ABORDADO' ? 'Abordaje confirmado' : 'Alumno ausente',
      detail: `${child?.name || 'Alumno'} marcado como ${status === 'ABORDADO' ? 'abordado' : 'ausente'}.`,
      life: 2500,
    });
  }

  // ── Delivery ─────────────────────────────────────────────────────────────
  protected authorizedPersonsOf(childId: string) {
    return this.stakeholderStore.authorizedPersonsOf(childId);
  }

  protected openHandover(child: { id: string; name: string }): void {
    this.handoverChild = child;
    this.receiverChoice = '';
    this.unknownReceiverName = '';
    this.handoverRef = this.dialog.open(this.handoverTpl(), { width: '440px', autoFocus: false });
  }

  protected closeHandover(): void {
    this.handoverRef?.close();
  }

  protected async confirmHandover(): Promise<void> {
    const trip = this.tripData();
    const child = this.handoverChild;
    if (!trip?.id || !child || !this.receiverChoice) return;
    const unregistered = this.receiverChoice === NOT_REGISTERED;
    this.saving.set(true);
    const handover = await this.tripStore.recordHandover({
      tripId: trip.id,
      childId: child.id,
      authorizedPersonId: unregistered ? null : this.receiverChoice,
      receiverName: unregistered ? this.unknownReceiverName.trim() : undefined,
    });
    this.saving.set(false);
    if (!handover) {
      this.toast.add({ severity: 'error', summary: 'Error', detail: 'No se pudo registrar la entrega.' });
      return;
    }
    this.closeHandover();
    this.toast.add({
      severity: handover.delivered ? 'success' : 'warn',
      summary: handover.delivered ? 'Entrega registrada' : 'Alumno no entregado',
      detail: `${handover.summary} Se avisó al padre.`,
      life: 5000,
    });
  }

  protected openQrScanner(): void {
    this.dialog
      .open<BoardingScanner, BoardingScannerData, string | null>(BoardingScanner, {
        width: '360px',
        autoFocus: false,
        data: { students: this.boardingStudents().map(s => ({ id: s.id, name: s.name })) },
      })
      .afterClosed()
      .subscribe(childId => { if (childId) void this.markBoarding(childId, 'ABORDADO'); });
  }
}
