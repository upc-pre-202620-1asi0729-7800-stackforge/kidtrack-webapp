import { AfterViewInit, Component, OnDestroy, computed, inject, signal } from '@angular/core';
import * as L from 'leaflet';
import { IamStore } from '../../../../identity-and-access-management/application/iam.store';
import { Coordinates } from '../../../../shared/domain/model/coordinates';
import { TranslatePipe } from '../../../../shared/i18n/translate.pipe';
import { LatLngTuple, MapService } from '../../../../shared/infrastructure/map.service';
import { StakeholderStore } from '../../../../stakeholder-and-asset-management/application/stakeholder.store';
import { TripStore } from '../../../application/trip.store';

// ── Simulated route towards the family's home ──────────────────────────────
const ROUTE_PATH: LatLngTuple[] = [
  [-12.046374, -77.042793],
  [-12.052, -77.035],
  [-12.06, -77.03],
  [-12.068, -77.022],
  [-12.075, -77.015], // HOME_POSITION
];
const HOME_POSITION = ROUTE_PATH[ROUTE_PATH.length - 1];
const PROXIMITY_THRESHOLD_M = 500;
const STEP_INTERVAL_MS = 4000;

const distance = (a: LatLngTuple, b: LatLngTuple) => new Coordinates(a[0], a[1]).distanceTo(new Coordinates(b[0], b[1]));

/**
 * Parent's tracking view: bus position relative to the family's stop, ETA,
 * proximity alert (US19) and arrival confirmation (US20).
 */
@Component({
  selector: 'kt-parent-tracking',
  imports: [TranslatePipe],
  templateUrl: './parent-tracking.html',
  styleUrl: './parent-tracking.css',
})
export class ParentTracking implements AfterViewInit, OnDestroy {
  private readonly mapService = inject(MapService);
  private readonly iamStore = inject(IamStore);
  private readonly tripStore = inject(TripStore);
  private readonly stakeholderStore = inject(StakeholderStore);

  protected readonly busStepIdx = signal(0);
  protected readonly proximityAlert = signal(false);
  protected readonly proximityDist = signal<number | null>(null);
  protected readonly arrivalConfirmed = signal(false);
  protected readonly arrivalTime = signal<string | null>(null);
  protected readonly orsLoading = signal(false);

  /** Driver / vehicle of the trip that carries the parent's children (falls back to the demo values). */
  protected readonly busInfo = computed(() => {
    const parent = this.stakeholderStore.parentByEmail(this.iamStore.currentUser()?.email);
    const kidIds = parent ? this.stakeholderStore.childrenOf(parent.id).map(c => String(c.id)) : [];
    const trips = this.tripStore.trips().filter(t => t.studentIds.some(id => kidIds.includes(id)));
    const trip = trips.find(t => t.status === 'EN_ROUTE') ?? trips.find(t => t.status === 'SCHEDULED') ?? trips[0];
    return {
      driver: trip?.driverName || 'Carlos Ramirez',
      route: trip?.routeName || 'Ruta Norte — Comas / Los Olivos',
      vehiclePlate: trip?.vehiclePlate || 'ABC-123',
    };
  });

  protected readonly busStatus = computed(() =>
    this.arrivalConfirmed() ? 'COMPLETED' : this.busStepIdx() > 0 ? 'EN_ROUTE' : 'SCHEDULED');
  protected readonly statusLabel = computed(() =>
    ({ SCHEDULED: 'Programado', EN_ROUTE: 'En camino', COMPLETED: 'Llegó' })[this.busStatus()]);
  protected readonly statusClass = computed(() => this.busStatus().toLowerCase().replace('_', '-'));
  protected readonly statusIcon = computed(() =>
    this.busStatus() === 'COMPLETED' ? 'pi pi-check-circle' : this.busStatus() === 'EN_ROUTE' ? 'pi pi-car' : 'pi pi-clock');

  protected readonly etaLabel = computed(() => {
    if (this.arrivalConfirmed()) return this.arrivalTime();
    const mins = Math.round(((ROUTE_PATH.length - 1 - this.busStepIdx()) * STEP_INTERVAL_MS) / 60000);
    return mins <= 0 ? 'Llegando…' : `~${mins} min`;
  });

  protected readonly distanceLabel = computed(() => {
    const d = this.proximityDist();
    if (d === null) return '';
    return d >= 1000 ? `${(d / 1000).toFixed(1)} km` : `${d} m`;
  });

  protected readonly timeline = computed(() => [
    { time: '06:00', event: 'Bus salió del punto de inicio', done: this.busStepIdx() >= 0, icon: 'pi pi-flag' },
    { time: '06:15', event: 'Parada 1 - Av. Universitaria', done: this.busStepIdx() >= 1, icon: 'pi pi-map-marker' },
    { time: '06:30', event: 'Parada 2 - Av. Angélica Gamarra', done: this.busStepIdx() >= 2, icon: 'pi pi-map-marker' },
    { time: '06:45', event: 'Parada 3 - Jr. Las Orquídeas', done: this.busStepIdx() >= 3, icon: 'pi pi-map-marker' },
    { time: '07:00', event: 'Llegada a tu zona', done: this.arrivalConfirmed(), icon: 'pi pi-home' },
  ]);

  private map: L.Map | null = null;
  private busMarker: L.Marker | null = null;
  private routeLine: L.Polyline | null = null;
  private simTimer: ReturnType<typeof setInterval> | undefined;

  ngAfterViewInit(): void {
    const orgId = this.iamStore.organizationId();
    void this.tripStore.loadTrips(orgId);
    void this.stakeholderStore.loadAll(orgId);
    this.initMap();
    void this.loadRoadRoute();
    this.simTimer = setInterval(() => this.advanceBus(), STEP_INTERVAL_MS);
  }

  ngOnDestroy(): void {
    clearInterval(this.simTimer);
    this.map?.remove();
    this.map = null;
  }

  protected dismissProximity(): void {
    this.proximityAlert.set(false);
  }

  private initMap(): void {
    const map = this.mapService.createMap('tracking-map', ROUTE_PATH[0], 13);
    this.map = map;
    this.routeLine = L.polyline(ROUTE_PATH, { color: '#E07A2B', weight: 4, dashArray: '8, 4', opacity: 0.5 }).addTo(map);
    map.fitBounds(this.routeLine.getBounds(), { padding: [40, 40] });

    const busIcon = L.divIcon({
      html: '<div style="background:#E07A2B;border-radius:50%;width:34px;height:34px;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,0.3)"><i class=\'pi pi-car\' style=\'color:#1a1a2e;font-size:16px\'></i></div>',
      className: '', iconSize: [34, 34], iconAnchor: [17, 17],
    });
    this.busMarker = L.marker(ROUTE_PATH[0], { icon: busIcon, zIndexOffset: 1000 }).addTo(map).bindPopup(`🚌 ${this.busInfo().driver}`);

    const homeIcon = L.divIcon({
      html: '<div style="background:#22C55E;border-radius:50%;width:30px;height:30px;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(0,0,0,0.2)"><i class=\'pi pi-home\' style=\'color:#fff;font-size:14px\'></i></div>',
      className: '', iconSize: [30, 30], iconAnchor: [15, 15],
    });
    L.marker(HOME_POSITION, { icon: homeIcon }).addTo(map).bindPopup('Tu domicilio');
  }

  private async loadRoadRoute(): Promise<void> {
    this.orsLoading.set(true);
    try {
      const { path } = await this.mapService.fetchRoadRoute(ROUTE_PATH.map(([lat, lng]) => ({ lat, lng })));
      if (this.map && this.routeLine) {
        this.map.removeLayer(this.routeLine);
        this.routeLine = L.polyline(path, { color: '#E07A2B', weight: 4, opacity: 0.9 }).addTo(this.map);
        this.map.fitBounds(this.routeLine.getBounds(), { padding: [40, 40] });
      }
    } catch (error) {
      console.warn('ORS tracking failed, keeping straight line:', error);
    } finally {
      this.orsLoading.set(false);
    }
  }

  private advanceBus(): void {
    const next = this.busStepIdx() + 1;
    if (next >= ROUTE_PATH.length) {
      // US20 — Arrival confirmation
      if (!this.arrivalConfirmed()) {
        this.arrivalConfirmed.set(true);
        this.proximityAlert.set(false);
        this.arrivalTime.set(new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }));
        this.busMarker?.setLatLng(HOME_POSITION);
      }
      clearInterval(this.simTimer);
      return;
    }

    this.busStepIdx.set(next);
    this.busMarker?.setLatLng(ROUTE_PATH[next]);
    this.map?.panTo(ROUTE_PATH[next], { animate: true, duration: 0.5 });

    // US19 — Proximity detection
    const dist = distance(ROUTE_PATH[next], HOME_POSITION);
    this.proximityDist.set(Math.round(dist));
    if (dist <= PROXIMITY_THRESHOLD_M && !this.proximityAlert() && !this.arrivalConfirmed()) {
      this.proximityAlert.set(true);
      if ('vibrate' in navigator) navigator.vibrate([300, 100, 300]);
    }
  }
}
