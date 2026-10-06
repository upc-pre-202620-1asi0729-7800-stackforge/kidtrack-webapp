import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { EntityId } from '../../shared/domain/model/base-entity';
import { BoardingStatus, Child } from '../domain/model/child.entity';
import { Driver } from '../domain/model/driver.entity';
import { Parent } from '../domain/model/parent.entity';
import { StakeholderApi } from '../infrastructure/stakeholder-api';
import { ChildAssembler, DriverAssembler, ParentAssembler } from '../infrastructure/stakeholder.assemblers';

const sameId = (a: EntityId | null | undefined, b: EntityId | null | undefined) => a !== null && a !== undefined && String(a) === String(b);

/**
 * Signal store for the Stakeholder bounded context: parents, students and drivers
 * of the organization.
 */
@Injectable({ providedIn: 'root' })
export class StakeholderStore {
  private readonly api = inject(StakeholderApi);

  readonly parents = signal<Parent[]>([]);
  readonly children = signal<Child[]>([]);
  readonly drivers = signal<Driver[]>([]);
  readonly loaded = signal(false);
  readonly errors = signal<unknown[]>([]);

  readonly activeDrivers = computed(() => this.drivers().filter(d => d.active));
  readonly activeChildren = computed(() => this.children().filter(c => c.active));

  childrenOf(parentId: EntityId | null): Child[] {
    return this.children().filter(c => sameId(c.parentId, parentId));
  }

  parentById(parentId: EntityId | null): Parent | undefined {
    return this.parents().find(p => sameId(p.id, parentId));
  }

  parentByEmail(email: string | undefined): Parent | undefined {
    return email ? this.parents().find(p => p.email === email) : undefined;
  }

  async loadAll(organizationId: string | null): Promise<void> {
    try {
      const [parents, children, drivers] = await Promise.all([
        firstValueFrom(this.api.getParentsByOrganization(organizationId)),
        firstValueFrom(this.api.getChildrenByOrganization(organizationId)),
        firstValueFrom(this.api.getDriversByOrganization(organizationId)),
      ]);
      this.parents.set(ParentAssembler.toEntitiesFromResources(parents));
      this.children.set(ChildAssembler.toEntitiesFromResources(children));
      this.drivers.set(DriverAssembler.toEntitiesFromResources(drivers));
      this.loaded.set(true);
    } catch (error) {
      this.pushError(error);
    }
  }

  // ─── Parents ─────────────────────────────────────────────────────────────

  /**
   * Creates/updates a parent and synchronizes the students edited alongside it:
   * removed students are deleted, new ones created and existing ones updated.
   */
  async saveParentWithChildren(parent: Parent, children: Child[]): Promise<Parent | null> {
    try {
      const resource = ParentAssembler.toResourceFromEntity(parent);
      const saved = ParentAssembler.toEntityFromResource(await firstValueFrom(
        parent.id === null ? this.api.createParent(resource) : this.api.updateParent(parent.id, resource),
      ));
      this.parents.update(list => (parent.id === null ? [...list, saved] : list.map(p => (sameId(p.id, saved.id) ? saved : p))));

      const previous = this.childrenOf(saved.id);
      const keptIds = new Set(children.filter(c => c.id !== null).map(c => String(c.id)));
      for (const removed of previous.filter(c => !keptIds.has(String(c.id)))) {
        await firstValueFrom(this.api.deleteChild(removed.id!));
      }
      const savedChildren: Child[] = [];
      for (const child of children) {
        const payload = ChildAssembler.toResourceFromEntity(new Child({ ...child, parentId: saved.id, organizationId: saved.organizationId }));
        savedChildren.push(ChildAssembler.toEntityFromResource(await firstValueFrom(
          child.id === null ? this.api.createChild(payload) : this.api.updateChild(child.id, payload),
        )));
      }
      this.children.update(list => [...list.filter(c => !sameId(c.parentId, saved.id)), ...savedChildren]);
      return saved;
    } catch (error) {
      this.pushError(error);
      return null;
    }
  }

  async deleteParent(parent: Parent): Promise<boolean> {
    try {
      for (const child of this.childrenOf(parent.id)) await firstValueFrom(this.api.deleteChild(child.id!));
      await firstValueFrom(this.api.deleteParent(parent.id!));
      this.children.update(list => list.filter(c => !sameId(c.parentId, parent.id)));
      this.parents.update(list => list.filter(p => !sameId(p.id, parent.id)));
      return true;
    } catch (error) {
      this.pushError(error);
      return false;
    }
  }

  // ─── Children ────────────────────────────────────────────────────────────

  async saveChild(child: Child): Promise<Child | null> {
    try {
      const resource = ChildAssembler.toResourceFromEntity(child);
      const saved = ChildAssembler.toEntityFromResource(await firstValueFrom(
        child.id === null ? this.api.createChild(resource) : this.api.updateChild(child.id, resource),
      ));
      this.children.update(list => (child.id === null ? [...list, saved] : list.map(c => (sameId(c.id, saved.id) ? saved : c))));
      return saved;
    } catch (error) {
      this.pushError(error);
      return null;
    }
  }

  async deleteChild(child: Child): Promise<boolean> {
    try {
      await firstValueFrom(this.api.deleteChild(child.id!));
      this.children.update(list => list.filter(c => !sameId(c.id, child.id)));
      return true;
    } catch (error) {
      this.pushError(error);
      return false;
    }
  }

  /** Records the latest boarding status of a student (used by the driver's boarding checklist). */
  async updateBoardingStatus(childId: EntityId, boardingStatus: BoardingStatus): Promise<void> {
    try {
      const saved = ChildAssembler.toEntityFromResource(await firstValueFrom(this.api.patchChild(childId, { boardingStatus })));
      this.children.update(list => list.map(c => (sameId(c.id, saved.id) ? saved : c)));
    } catch (error) {
      this.pushError(error);
    }
  }

  // ─── Drivers ─────────────────────────────────────────────────────────────

  async saveDriver(driver: Driver): Promise<Driver | null> {
    try {
      const resource = DriverAssembler.toResourceFromEntity(driver);
      const saved = DriverAssembler.toEntityFromResource(await firstValueFrom(
        driver.id === null ? this.api.createDriver(resource) : this.api.updateDriver(driver.id, resource),
      ));
      this.drivers.update(list => (driver.id === null ? [...list, saved] : list.map(d => (sameId(d.id, saved.id) ? saved : d))));
      return saved;
    } catch (error) {
      this.pushError(error);
      return null;
    }
  }

  async deleteDriver(driver: Driver): Promise<boolean> {
    try {
      await firstValueFrom(this.api.deleteDriver(driver.id!));
      this.drivers.update(list => list.filter(d => !sameId(d.id, driver.id)));
      return true;
    } catch (error) {
      this.pushError(error);
      return false;
    }
  }

  private pushError(error: unknown): void {
    this.errors.update(list => [...list, error]);
  }
}
