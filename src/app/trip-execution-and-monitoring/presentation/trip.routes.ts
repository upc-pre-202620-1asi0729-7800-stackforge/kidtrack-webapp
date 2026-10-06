import { Routes } from '@angular/router';

/** Routes for the Trip bounded context (mounted under /trip-execution-and-monitoring). */
export const tripRoutes: Routes = [
  { path: 'trips', title: 'Trips',
    loadComponent: () => import('./views/trip-list/trip-list').then(m => m.TripList) },
  { path: 'monitor', title: 'Trip Monitor',
    loadComponent: () => import('./views/trip-monitoring/trip-monitoring').then(m => m.TripMonitoring) },
  { path: 'active', title: 'Active Trip',
    loadComponent: () => import('./views/active-trip/active-trip').then(m => m.ActiveTrip) },
  { path: 'tracking', title: 'Trip Tracking',
    loadComponent: () => import('./views/parent-tracking/parent-tracking').then(m => m.ParentTracking) },
  { path: 'attendance', title: 'Attendance History',
    loadComponent: () => import('./views/attendance-history/attendance-history').then(m => m.AttendanceHistory) },
];
