/**
 * Stop along a route (value object of the Route aggregate).
 * Students are assigned per stop.
 */
export interface Waypoint {
  order: number;
  name: string;
  lat: number;
  lng: number;
  studentIds: string[];
}
