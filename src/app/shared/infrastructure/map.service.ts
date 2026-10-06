import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import * as L from 'leaflet';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

export type LatLngTuple = [number, number];
export interface LatLngPoint { lat: number; lng: number; }

export interface RoadRoute {
  /** Full road geometry as [lat, lng] pairs. */
  path: LatLngTuple[];
  /** Index in `path` for each input waypoint. */
  wayPointIndices: number[];
}

interface OrsGeoJson {
  features?: { geometry: { coordinates: [number, number][] }; properties: { way_points?: number[] } }[];
}

export const LIMA: LatLngTuple = [-12.046374, -77.042793];

/**
 * Shared Map Service — integrates Leaflet (rendering) and OpenRouteService (road routing).
 * Matches the Map Service of the shared component diagram.
 */
@Injectable({ providedIn: 'root' })
export class MapService {
  private readonly http = inject(HttpClient);
  private readonly cache = new Map<string, RoadRoute>();

  /** Creates a Leaflet map with the OpenStreetMap tile layer. */
  createMap(element: string | HTMLElement, center: LatLngTuple = LIMA, zoom = 12, options: L.MapOptions = {}): L.Map {
    const map = L.map(element, options).setView(center, zoom);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
    }).addTo(map);
    return map;
  }

  /** Numbered stop marker: green = origin, red = destination, navy = intermediate. */
  stopIcon(n: number, isFirst: boolean, isLast: boolean, size = 26): L.DivIcon {
    const bg = isFirst ? '#16a34a' : isLast ? '#DE4A26' : '#1E3A63';
    const font = size >= 26 ? 11 : 10;
    const border = size >= 26 ? 2.5 : 2;
    return L.divIcon({
      className: '',
      html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${bg};color:#fff;font-size:${font}px;font-weight:800;display:flex;align-items:center;justify-content:center;border:${border}px solid #E07A2B;box-shadow:0 2px 8px rgba(0,0,0,.4)">${n}</div>`,
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
    });
  }

  /**
   * Fetches a driving route through the given waypoints from OpenRouteService.
   * ORS uses [lng, lat]; this always returns Leaflet-friendly [lat, lng].
   * Throws on network/API errors so callers can fall back to straight lines.
   */
  async fetchRoadRoute(waypoints: LatLngPoint[]): Promise<RoadRoute> {
    if (!waypoints || waypoints.length < 2) {
      return { path: waypoints.map(w => [w.lat, w.lng] as LatLngTuple), wayPointIndices: waypoints.map((_, i) => i) };
    }
    const cacheKey = waypoints.map(w => `${w.lat.toFixed(5)},${w.lng.toFixed(5)}`).join('|');
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    const data = await firstValueFrom(
      this.http.post<OrsGeoJson>(
        `${environment.orsBaseUrl}/v2/directions/driving-car/geojson`,
        { coordinates: waypoints.map(w => [w.lng, w.lat]) },
        {
          headers: new HttpHeaders({
            Authorization: environment.orsApiKey,
            'Content-Type': 'application/json',
            Accept: 'application/json, application/geo+json',
          }),
        },
      ),
    );
    const feature = data.features?.[0];
    if (!feature) throw new Error('ORS returned no features');

    const result: RoadRoute = {
      path: feature.geometry.coordinates.map(([lng, lat]) => [lat, lng] as LatLngTuple),
      wayPointIndices: feature.properties.way_points ?? waypoints.map((_, i) => i),
    };
    this.cache.set(cacheKey, result);
    return result;
  }
}
