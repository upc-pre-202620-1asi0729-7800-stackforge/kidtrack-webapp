import { Component, OnInit, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { FleetStore } from '../../../../fleet-and-route-planning/application/fleet.store';
import { IamStore } from '../../../../identity-and-access-management/application/iam.store';
import { StakeholderStore } from '../../../../stakeholder-and-asset-management/application/stakeholder.store';
import { TripStore } from '../../../../trip-execution-and-monitoring/application/trip.store';
import { TranslatePipe } from '../../../i18n/translate.pipe';
import { TranslationService } from '../../../i18n/translation.service';

interface Metric { icon: string; value: number; label: string; }
interface DashCard { icon: string; title: string; desc: string; path: string; query?: Record<string, string>; }

const ROLE_ICON: Record<string, string> = { ADMIN: 'pi pi-shield', DRIVER: 'pi pi-car', PARENT: 'pi pi-heart' };

/**
 * Role-based home dashboard with organization metrics computed from the API.
 */
@Component({
  selector: 'kt-home',
  imports: [TranslatePipe],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home implements OnInit {
  private readonly router = inject(Router);
  private readonly i18n = inject(TranslationService);
  private readonly tripStore = inject(TripStore);
  private readonly fleetStore = inject(FleetStore);
  private readonly stakeholderStore = inject(StakeholderStore);
  protected readonly store = inject(IamStore);

  protected readonly user = this.store.currentUser;
  protected readonly role = computed(() => this.user()?.roleTier ?? '');
  protected readonly roleIcon = computed(() => ROLE_ICON[this.role()] ?? 'pi pi-user');
  protected readonly roleLabel = computed(() => {
    this.i18n.locale();
    return this.i18n.t(`home.role.${this.role().toLowerCase() || 'guest'}`);
  });

  protected readonly metrics = computed<Metric[]>(() => {
    const trips = this.tripStore.trips();
    const myId = String(this.user()?.id ?? '');

    if (this.role() === 'DRIVER') {
      const mine = trips.filter(t => t.driverId === myId);
      return [
        { icon: 'pi pi-map-marker', value: new Set(mine.map(t => String(t.routeId))).size, label: 'My Routes' },
        { icon: 'pi pi-car', value: mine.filter(t => t.status === 'EN_ROUTE').length, label: 'Trips Active' },
        { icon: 'pi pi-users', value: new Set(mine.flatMap(t => t.studentIds)).size, label: 'Students Served' },
      ];
    }

    if (this.role() === 'PARENT') {
      const parent = this.stakeholderStore.parentByEmail(this.user()?.email);
      const kidIds = parent ? this.stakeholderStore.childrenOf(parent.id).map(c => String(c.id)) : [];
      const withKids = trips.filter(t => t.studentIds.some(id => kidIds.includes(id)));
      return [
        { icon: 'pi pi-graduation-cap', value: kidIds.length, label: 'My Children' },
        { icon: 'pi pi-car', value: withKids.filter(t => t.status === 'EN_ROUTE').length, label: 'Trips Active' },
        { icon: 'pi pi-map-marker', value: withKids.length, label: 'Routes Assigned' },
      ];
    }

    return [
      { icon: 'pi pi-map-marker', value: this.fleetStore.routes().length, label: 'Routes' },
      { icon: 'pi pi-car', value: trips.filter(t => t.status === 'EN_ROUTE').length, label: 'Trips in Route' },
      { icon: 'pi pi-users', value: this.store.organizationUsers().length, label: 'Users' },
    ];
  });

  protected readonly adminCards: DashCard[] = [
    { icon: 'pi pi-id-card', title: 'Register Drivers', desc: 'Gestiona conductores: licencias, vehículo asignado y estado.', path: '/stakeholder-and-asset-management/management', query: { tab: 'drivers' } },
    { icon: 'pi pi-map-marker', title: 'Register Routes', desc: 'Crea rutas con paradas, conductor, vehículo y horario.', path: '/fleet-and-route-planning/management' },
    { icon: 'pi pi-graduation-cap', title: 'Register Students', desc: 'Registra alumnos y vincúlalos con sus padres.', path: '/stakeholder-and-asset-management/management', query: { tab: 'children' } },
    { icon: 'pi pi-users', title: 'Register Parent', desc: 'Administra padres de familia y datos de contacto.', path: '/stakeholder-and-asset-management/management', query: { tab: 'parents' } },
    { icon: 'pi pi-shield', title: 'Assign Roles', desc: 'Asigna roles ADMIN / DRIVER / PARENT a los usuarios.', path: '/identity-and-access-management/organization' },
  ];

  protected readonly driverCards: DashCard[] = [
    { icon: 'pi pi-car', title: 'home.driver.trips', desc: 'home.driver.trips-desc', path: '/trip-execution-and-monitoring/trips' },
    { icon: 'pi pi-map-marker', title: 'home.driver.routes', desc: 'home.driver.routes-desc', path: '/fleet-and-route-planning/routes' },
    { icon: 'pi pi-bell', title: 'home.driver.alerts', desc: 'home.driver.alerts-desc', path: '/notifications-and-communication/alerts' },
  ];

  protected readonly parentCards: DashCard[] = [
    { icon: 'pi pi-heart', title: 'My Child', desc: 'Sigue en tiempo real el viaje y la ubicación de tu hijo.', path: '/trip-execution-and-monitoring/tracking' },
    { icon: 'pi pi-exclamation-triangle', title: 'Incident Report', desc: 'Revisa reportes de incidentes ocurridos durante los viajes.', path: '/notifications-and-communication/alerts' },
    { icon: 'pi pi-check-square', title: 'Check Assistance', desc: 'Verifica la asistencia y estado de abordaje de tu hijo.', path: '/trip-execution-and-monitoring/attendance' },
  ];

  ngOnInit(): void {
    const orgId = this.store.organizationId();
    void this.tripStore.loadTrips(orgId);
    if (this.role() === 'ADMIN') {
      void this.fleetStore.loadRoutes(orgId);
      if (orgId) void this.store.loadOrganizationUsers(orgId);
    }
    if (this.role() === 'PARENT') void this.stakeholderStore.loadAll(orgId);
  }

  protected go(card: DashCard): void {
    void this.router.navigate([card.path], { queryParams: card.query });
  }
}
