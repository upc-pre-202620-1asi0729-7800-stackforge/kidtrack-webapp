import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { Organization } from '../domain/model/organization.entity';
import { User } from '../domain/model/user.entity';
import { IamApi } from '../infrastructure/iam-api';
import { TOKEN_STORAGE_KEY } from '../infrastructure/iam.interceptor';
import { SignUpRequest } from '../infrastructure/iam.resources';
import { OrganizationAssembler } from '../infrastructure/organization.assembler';
import { UserAssembler } from '../infrastructure/user.assembler';

const USER_STORAGE_KEY = 'kidtrack.user';

/**
 * Signal store for the IAM bounded context: session state and the active user's role.
 * Matches IamStore in the IAM component diagram.
 */
@Injectable({ providedIn: 'root' })
export class IamStore {
  private readonly api = inject(IamApi);

  readonly currentUser = signal<User | null>(this.loadStoredUser());
  readonly organization = signal<Organization | null>(null);
  readonly organizationUsers = signal<User[]>([]);
  readonly token = signal<string | null>(localStorage.getItem(TOKEN_STORAGE_KEY));
  readonly loading = signal(false);
  readonly errors = signal<unknown[]>([]);

  readonly isAuthenticated = computed(() => !!this.token() && !!this.currentUser());
  readonly isAdmin = computed(() => this.currentUser()?.roleTier === 'ADMIN');
  readonly organizationId = computed(() => this.currentUser()?.organizationId ?? null);

  // ─── Authentication ──────────────────────────────────────────────────────

  /** Signs the user in. On success persists token + user and returns the User entity. */
  async signIn(email: string, password: string): Promise<User | null> {
    this.loading.set(true);
    try {
      const { token, ...resource } = await firstValueFrom(this.api.signIn(email, password));
      const user = UserAssembler.toEntityFromResource(resource);
      this.persistSession(token, user);
      return user;
    } catch (error) {
      this.pushError(error);
      return null;
    } finally {
      this.loading.set(false);
    }
  }

  signOut(): void {
    this.token.set(null);
    this.currentUser.set(null);
    this.organization.set(null);
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(USER_STORAGE_KEY);
  }

  /** Registers a new admin user for the given organization. */
  registerAdmin(request: Omit<SignUpRequest, 'roleTier'>): Promise<User | null> {
    return this.registerUser({ ...request, roleTier: 'ADMIN' });
  }

  /** Registers a user (admin, parent or driver). */
  async registerUser(request: SignUpRequest): Promise<User | null> {
    this.loading.set(true);
    try {
      return UserAssembler.toEntityFromResource(await firstValueFrom(this.api.signUp(request)));
    } catch (error) {
      this.pushError(error);
      return null;
    } finally {
      this.loading.set(false);
    }
  }

  /** Updates the signed-in user's personal data. */
  async updateProfile(changes: Pick<User, 'firstName' | 'lastName' | 'email' | 'phone'>): Promise<boolean> {
    const user = this.currentUser();
    if (!user?.id) return false;
    try {
      const updated = UserAssembler.toEntityFromResource(await firstValueFrom(this.api.patchUser(user.id, changes)));
      this.persistSession(this.token(), updated);
      return true;
    } catch (error) {
      this.pushError(error);
      return false;
    }
  }

  /** Changes the password after re-validating the current one against the sign-in endpoint. */
  async changePassword(currentPassword: string, newPassword: string): Promise<'ok' | 'invalid-current' | 'error'> {
    const user = this.currentUser();
    if (!user?.id) return 'error';
    try {
      await firstValueFrom(this.api.signIn(user.email, currentPassword));
    } catch {
      return 'invalid-current';
    }
    try {
      await firstValueFrom(this.api.patchUser(user.id, { password: newPassword }));
      return 'ok';
    } catch (error) {
      this.pushError(error);
      return 'error';
    }
  }

  // ─── Organization ────────────────────────────────────────────────────────

  async loadOrganizationUsers(organizationId: string): Promise<void> {
    try {
      this.organizationUsers.set(UserAssembler.toEntitiesFromResources(await firstValueFrom(this.api.getUsersByOrganization(organizationId))));
    } catch (error) {
      this.pushError(error);
    }
  }

  async loadOrganization(id: string): Promise<void> {
    this.loading.set(true);
    try {
      this.organization.set(OrganizationAssembler.toEntityFromResource(await firstValueFrom(this.api.getOrganizationById(id))));
    } catch (error) {
      this.pushError(error);
    } finally {
      this.loading.set(false);
    }
  }

  async createOrganization(name: string): Promise<Organization | null> {
    this.loading.set(true);
    try {
      const resource = await firstValueFrom(
        this.api.createOrganization({ name, status: 'ACTIVE', createdAt: new Date().toISOString() }),
      );
      const created = OrganizationAssembler.toEntityFromResource(resource);
      this.organization.set(created);
      return created;
    } catch (error) {
      this.pushError(error);
      return null;
    } finally {
      this.loading.set(false);
    }
  }

  async updateOrganization(organization: Organization): Promise<Organization | null> {
    if (!organization.id) return null;
    this.loading.set(true);
    try {
      const resource = await firstValueFrom(
        this.api.patchOrganization(organization.id, OrganizationAssembler.toResourceFromEntity(organization)),
      );
      const updated = OrganizationAssembler.toEntityFromResource(resource);
      this.organization.set(updated);
      return updated;
    } catch (error) {
      this.pushError(error);
      return null;
    } finally {
      this.loading.set(false);
    }
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────

  private persistSession(token: string | null, user: User): void {
    this.token.set(token);
    this.currentUser.set(user);
    if (token) localStorage.setItem(TOKEN_STORAGE_KEY, token);
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify({
      id: user.id, firstName: user.firstName, lastName: user.lastName, email: user.email,
      phone: user.phone, roleTier: user.roleTier, organizationId: user.organizationId,
    }));
  }

  private loadStoredUser(): User | null {
    const raw = localStorage.getItem(USER_STORAGE_KEY);
    if (!raw) return null;
    try { return new User(JSON.parse(raw)); } catch { return null; }
  }

  private pushError(error: unknown): void {
    this.errors.update(list => [...list, error]);
  }
}
