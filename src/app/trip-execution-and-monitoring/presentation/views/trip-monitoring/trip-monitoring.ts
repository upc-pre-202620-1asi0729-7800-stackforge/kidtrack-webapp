import { AfterViewInit, Component, OnDestroy, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import * as L from 'leaflet';
import { FleetStore } from '../../../../fleet-and-route-planning/application/fleet.store';
import { Route } from '../../../../fleet-and-route-planning/domain/model/route.entity';
import { IamStore } from '../../../../identity-and-access-management/application/iam.store';
import { TranslatePipe } from '../../../../shared/i18n/translate.pipe';
import { LIMA, MapService } from '../../../../shared/infrastructure/map.service';
import { TripStore } from '../../../application/trip.store';
import { Trip } from '../../../domain/model/trip.entity';

const BUS_ICON = L.divIcon({
  html: `<div style="background:#E07A2B;border-radius:50%;width:32px;height:32px;display:flex;align-items:center;justify-content:center;box-shadow:0 3px 10px rgba(0,0,0,.35);border:3px solid #fff">
           <i class='pi pi-car' style='color:#1a1a2e;font-size:14px'></i>
         </div>`,
  className: '',
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

/** Admin's live monitoring view: trips list, bus position on the map and trip detail. */
@Component({
  selector: 'kt-trip-monitoring',
  imports: [MatButtonModule, TranslatePipe],
  templateUrl: './trip-monitoring.html',
  styleUrl: './trip-monitoring.css',
})
export class TripMonitoring implements AfterViewInit, OnDestroy {
  private readonly mapService = inject(MapService);
  private readonly iamStore = inject(IamStore);
  private readonly fleetStore = inject(FleetStore);
  protected readonly tripStore = inject(TripStore);

  protected readonly trips = this.tripStore.trips;
  protected readonly selected = signal<Trip | null>(null);
  protected readonly loading = signal(false);
  protected readonly orsLoading = signal(false);
  protected readonly selectedRoute = computed(() => this.routeFor(this.selected()));

  private map: L.Map | null = null;
  private layers: L.Layer[] = [];

  async ngAfterViewInit(): Promise<void> {
    await this.loadData();
    this.map = this.mapService.createMap('trip-map');
    const trips = this.trips();
    const initial = trips.find(t => t.status === 'EN_ROUTE') ?? trips[0];
    if (initial) this.selectTrip(initial);
  }

  ngOnDestroy(): void {
    this.map?.remove();
    this.map = null;
  }

  protected async loadData(): Promise<void> {
    this.loading.set(true);
    const orgId = this.iamStore.organizationId();
    await Promise.all([this.tripStore.loadTrips(orgId), this.fleetStore.loadRoutes(orgId)]);
    this.loading.set(false);
    const current = this.selected();
    if (current) {
      const refreshed = this.trips().find(t => String(t.id) === String(current.id));
      if (refreshed) this.selectTrip(refreshed);
    }
  }

  protected selectTrip(trip: Trip): void {
    this.selected.set(trip);
    void this.showTripOnMap(trip);
  }

  protected isSelected(trip: Trip): boolean {
    return String(this.selected()?.id) === String(trip.id);
  }

  protected boardedPct(trip: Trip): number {
    return trip.studentsTotal ? (trip.studentsBoarded / trip.studentsTotal) * 100 : 0;
  }

  protected formatTime(iso: string | null): string {
    return iso ? new Date(iso).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }) : '';
  }

  protected stopColor(index: number, total: number): string {
    return index === 0 ? '#16a34a' : index === total - 1 ? '#DE4A26' : '#1E3A63';
  }

  private routeFor(trip: Trip | null): Route | undefined {
    return trip ? this.fleetStore.routes().find(r => String(r.id) === String(trip.routeId)) : undefined;
  }

  private clearLayers(): void {
    this.layers.forEach(l => this.map?.removeLayer(l));
    this.layers = [];
  }

  private async showTripOnMap(trip: Trip): Promise<void> {
    const map = this.map;
    if (!map) return;
    this.clearLayers();

    const wps = this.routeFor(trip)?.waypoints ?? [];
    if (!wps.length) { map.setView(LIMA, 12); return; }

    const coords = wps.map(w => [w.lat, w.lng] as L.LatLngTuple);
    const lineColor = trip.status === 'COMPLETED' ? '#94a3b8' : '#E07A2B';

    wps.forEach((wp, i) => {
      this.layers.push(
        L.marker([wp.lat, wp.lng], { icon: this.mapService.stopIcon(i + 1, i === 0, i === wps.length - 1, 22) })
          .addTo(map)
          .bindPopup(`<b>${i + 1}. ${wp.name}</b>`),
      );
    });

    // Bus position — current stop (or the first one)
    const currentStop = wps.find(w => w.name === trip.currentStop) ?? wps[0];
    const distanceKm = (Math.random() * 5 + 1).toFixed(1); // simulated
    const bus = L.marker([currentStop.lat, currentStop.lng], { icon: BUS_ICON, zIndexOffset: 1000 })
      .addTo(map)
      .bindPopup(`<b>🚌 ${trip.driverName}</b><br>${trip.currentStop || 'En ruta'}<br><small style="color:#6b7280; font-weight:600"><i class="pi pi-map-marker"></i> Distancia recorrida: ~${distanceKm} km</small>`)
      .openPopup();
    this.layers.push(bus);

    const placeholder = L.polyline(coords, { color: lineColor, weight: 5, opacity: 0.3, dashArray: '7 6' }).addTo(map);
    this.layers.push(placeholder);
    map.fitBounds(placeholder.getBounds(), { padding: [40, 40] });

    if (wps.length < 2) return;
    this.orsLoading.set(true);
    try {
      const { path } = await this.mapService.fetchRoadRoute(wps);
      if (!this.isSelected(trip) || !this.map) return;
      map.removeLayer(placeholder);
      this.layers = this.layers.filter(l => l !== placeholder);
      const road = L.polyline(path, { color: lineColor, weight: 5, opacity: 0.85 }).addTo(map);
      this.layers.push(road);
      map.fitBounds(road.getBounds(), { padding: [40, 40] });
    } catch (error) {
      console.warn('ORS monitoring failed, keeping straight line:', error);
    } finally {
      this.orsLoading.set(false);
    }
  }
}
