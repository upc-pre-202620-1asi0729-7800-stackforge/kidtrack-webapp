import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { Route } from '../../fleet-and-route-planning/domain/model/route.entity';
import { EntityId } from '../../shared/domain/model/base-entity';
import { Incident } from '../domain/model/incident.entity';
import { Trip } from '../domain/model/trip.entity';
import { TripApi } from '../infrastructure/trip-api';
import { IncidentAssembler, TripAssembler } from '../infrastructure/trip.assemblers';
import { TripResource } from '../infrastructure/trip.resources';

export type AutoTripResult =
    | { status: 'created'; trip: Trip }
    | { status: 'duplicate' | 'conflict'; trip: Trip }
    | { status: 'error' };

const sameId = (a: EntityId | null | undefined, b: EntityId | null | undefined) => a !== null && a !== undefined && String(a) === String(b);
const todayIso = () => new Date().toISOString().split('T')[0];

/**
 * Signal store for real-time trip execution: trip state, boarding progress and incident log.
 */
@Injectable({ providedIn: 'root' })
export class TripStore {
    private readonly api = inject(TripApi);

    readonly trips = signal<Trip[]>([]);
    readonly incidents = signal<Incident[]>([]);
    readonly loading = signal(false);
    readonly errors = signal<unknown[]>([]);

    // ─── Trips ───────────────────────────────────────────────────────────────

    async loadTrips(organizationId: string | null): Promise<Trip[]> {
        this.loading.set(true);
        try {
            const trips = TripAssembler.toEntitiesFromResources(await firstValueFrom(this.api.getTripsByOrganization(organizationId)));
            this.trips.set(trips);
            return trips;
        } catch (error) {
            this.pushError(error);
            return [];
        } finally {
            this.loading.set(false);
        }
    }

    /** Persists a partial update of a trip and refreshes it in the store. */
    async updateTrip(id: EntityId, changes: Partial<Trip>): Promise<Trip | null> {
        try {
            const { id: _ignored, ...partial } = changes as Partial<TripResource>;
            const saved = TripAssembler.toEntityFromResource(await firstValueFrom(this.api.patchTrip(id, partial)));
            this.trips.update(list => list.map(t => (sameId(t.id, saved.id) ? saved : t)));
            return saved;
        } catch (error) {
            this.pushError(error);
            return null;
        }
    }

    async deleteTrip(id: EntityId): Promise<void> {
        try {
            await firstValueFrom(this.api.deleteTrip(id));
            this.trips.update(list => list.filter(t => !sameId(t.id, id)));
        } catch (error) {
            this.pushError(error);
        }
    }

    /**
     * Auto-generates today's SCHEDULED trip for a complete route.
     * Rejects duplicates (same route/date/time) and driver/vehicle conflicts at the same date/time.
     */
    async autoCreateTripForRoute(route: Route, scheduledDate = todayIso()): Promise<AutoTripResult> {
        const all = await this.loadTrips(route.organizationId);

        const duplicate = all.find(t =>
            sameId(t.routeId, route.id) && t.scheduledDate === scheduledDate &&
            t.scheduledStartTime === route.scheduledStartTime && t.status !== 'CANCELLED');
        if (duplicate) return { status: 'duplicate', trip: duplicate };

        const conflict = all.find(t =>
            t.scheduledDate === scheduledDate && t.scheduledStartTime === route.scheduledStartTime &&
            (t.status === 'SCHEDULED' || t.status === 'EN_ROUTE') &&
            (t.driverId === route.driverId || (route.vehicleId !== null && sameId(t.vehicleId, route.vehicleId))));
        if (conflict) return { status: 'conflict', trip: conflict };

        try {
            const trip = new Trip({
                routeId: route.id,
                routeName: route.name,
                driverId: route.driverId,
                driverName: route.driverName,
                vehicleId: route.vehicleId,
                vehiclePlate: route.vehiclePlate,
                studentIds: [...route.studentIds],
                studentsTotal: route.studentIds.length,
                tripType: route.type,
                scheduledDate,
                scheduledStartTime: route.scheduledStartTime,
                status: 'SCHEDULED',
                organizationId: route.organizationId,
            });
            const created = TripAssembler.toEntityFromResource(await firstValueFrom(this.api.createTrip(TripAssembler.toResourceFromEntity(trip))));
            this.trips.update(list => [...list, created]);
            return { status: 'created', trip: created };
        } catch (error) {
            this.pushError(error);
            return { status: 'error' };
        }
    }

    // ─── Incidents ───────────────────────────────────────────────────────────

    async loadIncidents(organizationId: string | null): Promise<void> {
        try {
            this.incidents.set(IncidentAssembler.toEntitiesFromResources(await firstValueFrom(this.api.getIncidentsByOrganization(organizationId))));
        } catch (error) {
            this.pushError(error);
        }
    }

    async reportIncident(incident: Incident): Promise<Incident | null> {
        try {
            const created = IncidentAssembler.toEntityFromResource(
                await firstValueFrom(this.api.reportIncident(IncidentAssembler.toResourceFromEntity(incident))),
            );
            this.incidents.update(list => [created, ...list]);
            return created;
        } catch (error) {
            this.pushError(error);
            return null;
        }
    }

    async resolveIncident(id: EntityId): Promise<void> {
        try {
            const saved = IncidentAssembler.toEntityFromResource(await firstValueFrom(this.api.patchIncident(id, { status: 'RESOLVED' })));
            this.incidents.update(list => list.map(i => (sameId(i.id, saved.id) ? saved : i)));
        } catch (error) {
            this.pushError(error);
        }
    }

    private pushError(error: unknown): void {
        this.errors.update(list => [...list, error]);
    }
}
