import { Component, OnInit, TemplateRef, computed, inject, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogConfig, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTableModule } from '@angular/material/table';
import { ActivatedRoute } from '@angular/router';
import { Vehicle } from '../../../../fleet-and-route-planning/domain/model/vehicle.entity';
import { FleetStore } from '../../../../fleet-and-route-planning/application/fleet.store';
import { IamStore } from '../../../../identity-and-access-management/application/iam.store';
import { ConfirmService } from '../../../../shared/application/confirm.service';
import { ToastService } from '../../../../shared/application/toast.service';
import { EntityId } from '../../../../shared/domain/model/base-entity';
import { FullName } from '../../../../shared/domain/model/full-name';
import { StakeholderStore } from '../../../application/stakeholder.store';
import { BOARDING_LABEL, BOARDING_SEVERITY, BoardingStatus, Child } from '../../../domain/model/child.entity';
import { Driver } from '../../../domain/model/driver.entity';
import { Parent } from '../../../domain/model/parent.entity';

type Section = 'users' | 'logistics';
type UserTab = 'parents' | 'children';
type LogTab = 'drivers' | 'fleet';

interface ChildFormRow { id: EntityId | null; name: string; grade: string; active: boolean; boardingStatus: BoardingStatus; hasPhoto: boolean; }
interface ParentForm { id: EntityId | null; name: string; email: string; phone: string; active: boolean; password: string; formChildren: ChildFormRow[]; }
interface ChildForm { id: EntityId | null; name: string; grade: string; parentId: EntityId | null; boardingStatus: BoardingStatus; active: boolean; hasPhoto: boolean; }
interface LogForm { id: EntityId | null; nameOrPlate: string; licenseOrModel: string; vehicleId: EntityId | null; capacity: number; active: boolean; licenseVerified: boolean; }

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const DRAWER_CONFIG: MatDialogConfig = {
  position: { right: '0', top: '0' },
  height: '100vh',
  maxHeight: '100vh',
  maxWidth: '100vw',
  panelClass: 'kt-drawer-panel',
  autoFocus: false,
};

@Component({
  selector: 'kt-stakeholder-management',
  imports: [
    FormsModule, MatButtonModule, MatDialogModule, MatFormFieldModule, MatInputModule,
    MatSelectModule, MatSlideToggleModule, MatTableModule,
  ],
  templateUrl: './stakeholder-management.html',
  styleUrl: './stakeholder-management.css',
})
export class StakeholderManagement implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly dialog = inject(MatDialog);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);
  private readonly iamStore = inject(IamStore);
  protected readonly store = inject(StakeholderStore);
  protected readonly fleetStore = inject(FleetStore);

  private readonly parentDrawerTpl = viewChild.required<TemplateRef<unknown>>('parentDrawer');
  private readonly childDialogTpl = viewChild.required<TemplateRef<unknown>>('childDialog');
  private readonly carneDialogTpl = viewChild.required<TemplateRef<unknown>>('carneDialog');
  private readonly logDrawerTpl = viewChild.required<TemplateRef<unknown>>('logDrawer');
  private dialogRef: MatDialogRef<unknown> | null = null;

  protected readonly boardingLabel = BOARDING_LABEL;
  protected readonly boardingSeverity = BOARDING_SEVERITY;
  protected readonly boardingOptions: { label: string; value: BoardingStatus }[] = [
    { label: 'En Espera', value: 'EN_ESPERA' }, { label: 'Abordado', value: 'ABORDADO' }, { label: 'Ausente', value: 'AUSENTE' },
  ];

  protected readonly parentColumns = ['expander', 'name', 'email', 'phone', 'children', 'status', 'actions'];
  protected readonly nestedChildColumns = ['name', 'grade', 'boarding', 'status', 'actions'];
  protected readonly childColumns = ['name', 'grade', 'parent', 'boarding', 'status', 'actions'];
  protected readonly driverColumns = ['name', 'license', 'vehicle', 'status', 'actions'];
  protected readonly fleetColumns = ['plate', 'model', 'capacity', 'status', 'actions'];

  /* ── Section / tabs ───────────────────────────────────── */
  protected readonly section = signal<Section>('users');
  protected readonly userTab = signal<UserTab>('parents');
  protected readonly logTab = signal<LogTab>('drivers');
  protected readonly expandedParentId = signal<EntityId | null>(null);

  protected readonly addLabel = computed(() => {
    if (this.section() === 'users') return this.userTab() === 'children' ? 'Agregar Alumno' : 'Agregar Padre';
    return this.logTab() === 'drivers' ? 'Agregar Conductor' : 'Agregar Vehículo';
  });

  /* ── Forms ────────────────────────────────────────────── */
  protected parentForm: ParentForm = this.emptyParentForm();
  protected parentDrawerTitle = 'Nuevo Padre / Madre';
  protected childForm: ChildForm = this.emptyChildForm();
  protected childDialogTitle = 'Nuevo Alumno';
  protected readonly childHasPhoto = signal(false);
  protected carneData: Child | null = null;
  protected logForm: LogForm = this.emptyLogForm();
  protected logDrawerTitle = 'Nuevo Conductor';
  protected readonly licenseVerified = signal(false);
  protected readonly saving = signal(false);

  ngOnInit(): void {
    const tab = (this.route.snapshot.queryParamMap.get('tab') ?? '').toLowerCase();
    if (tab === 'parents' || tab === 'children') { this.section.set('users'); this.userTab.set(tab); }
    if (tab === 'drivers' || tab === 'fleet') { this.section.set('logistics'); this.logTab.set(tab); }

    const orgId = this.iamStore.organizationId();
    void this.store.loadAll(orgId);
    void this.fleetStore.loadVehicles(orgId);
  }

  /* ── Display helpers ──────────────────────────────────── */
  protected boardingLabelOf(child: Child): string {
    return this.boardingLabel[child.boardingStatus] ?? child.boardingStatus;
  }

  protected boardingSeverityOf(child: Child): string {
    return this.boardingSeverity[child.boardingStatus] ?? 'info';
  }

  protected childCount(parent: Parent): number {
    return this.store.childrenOf(parent.id).length;
  }

  protected parentName(child: Child): string {
    return this.store.parentById(child.parentId)?.name ?? '—';
  }

  protected vehicleFor(driver: Driver): Vehicle | undefined {
    return this.fleetStore.vehicles().find(v => driver.vehicleId !== null && String(v.id) === String(driver.vehicleId));
  }

  protected toggleExpanded(parent: Parent): void {
    this.expandedParentId.update(id => (id !== null && String(id) === String(parent.id) ? null : parent.id));
  }

  protected isExpanded(parent: Parent): boolean {
    const id = this.expandedParentId();
    return id !== null && String(id) === String(parent.id);
  }

  /* ── Header button action ─────────────────────────────── */
  protected onAddClick(): void {
    if (this.section() === 'users') {
      if (this.userTab() === 'children') this.openAddChild();
      else this.openAddParent();
    } else {
      this.openLogDrawer();
    }
  }

  protected closeDialog(): void {
    this.dialogRef?.close();
    this.dialogRef = null;
  }

  /* ══════════════ Parent CRUD ══════════════ */
  private emptyParentForm(): ParentForm {
    return { id: null, name: '', email: '', phone: '', active: true, password: '', formChildren: [] };
  }

  protected openAddParent(): void {
    this.parentForm = this.emptyParentForm();
    this.parentDrawerTitle = 'Nuevo Padre / Madre';
    this.dialogRef = this.dialog.open(this.parentDrawerTpl(), { ...DRAWER_CONFIG, width: '42vw', minWidth: '340px' });
  }

  protected openEditParent(parent: Parent): void {
    this.parentForm = {
      id: parent.id, name: parent.name, email: parent.email, phone: parent.phone, active: parent.active, password: '',
      formChildren: this.store.childrenOf(parent.id).map(c => ({
        id: c.id, name: c.name, grade: c.grade, active: c.active, boardingStatus: c.boardingStatus, hasPhoto: c.hasPhoto,
      })),
    };
    this.parentDrawerTitle = 'Editar Padre / Madre';
    this.dialogRef = this.dialog.open(this.parentDrawerTpl(), { ...DRAWER_CONFIG, width: '42vw', minWidth: '340px' });
  }

  protected onParentEmailChange(email: string): void {
    this.parentForm.email = email;
    if (!this.parentForm.id && email) this.parentForm.password = email.split('@')[0];
  }

  protected addFormChild(): void {
    this.parentForm.formChildren.push({ id: null, name: '', grade: '', active: true, boardingStatus: 'EN_ESPERA', hasPhoto: false });
  }

  protected removeFormChild(index: number): void {
    this.parentForm.formChildren.splice(index, 1);
  }

  protected async saveParent(): Promise<void> {
    const form = this.parentForm;
    if (!form.name || !form.email) {
      this.toast.add({ severity: 'error', summary: 'Error', detail: 'Por favor complete los campos obligatorios.' });
      return;
    }
    if (!EMAIL_REGEX.test(form.email)) {
      this.toast.add({ severity: 'error', summary: 'Error', detail: 'Formato no soportado en el correo electrónico.' });
      return;
    }
    if (this.store.parents().some(p => p.email === form.email && String(p.id) !== String(form.id))) {
      this.toast.add({ severity: 'error', summary: 'Error', detail: 'Usuario ya existe con este correo.' });
      return;
    }

    this.saving.set(true);
    const isNew = form.id === null;
    const orgId = this.iamStore.organizationId();
    const saved = await this.store.saveParentWithChildren(
      new Parent({ id: form.id, name: form.name, email: form.email, phone: form.phone, active: form.active, organizationId: orgId }),
      form.formChildren.map(c => new Child({ ...c, organizationId: orgId })),
    );
    if (saved && isNew && form.password) {
      // Parent account so the guardian can sign in to follow the bus.
      const name = FullName.fromText(form.name);
      await this.iamStore.registerUser({
        firstName: name.firstName, lastName: name.lastName, email: form.email,
        password: form.password, roleTier: 'PARENT', organizationId: orgId,
      });
    }
    this.saving.set(false);

    if (!saved) {
      this.toast.add({ severity: 'error', summary: 'Error', detail: 'No se pudo guardar el padre.' });
      return;
    }
    if (isNew) {
      this.toast.add({ severity: 'success', summary: 'Registrado', detail: 'Padre registrado correctamente.' });
      this.toast.add({ severity: 'info', summary: 'Invitación enviada', detail: `Se ha enviado un enlace de acceso al correo ${form.email}`, life: 5000 });
    } else {
      this.toast.add({ severity: 'success', summary: 'Actualizado', detail: 'Padre actualizado correctamente.' });
    }
    this.closeDialog();
  }

  protected deleteParent(parent: Parent): void {
    this.confirm.require({
      message: `¿Eliminar a ${parent.name} y todos sus hijos?`,
      header: 'Confirmar eliminación',
      icon: 'pi pi-exclamation-triangle',
      acceptSeverity: 'danger',
      accept: async () => {
        if (await this.store.deleteParent(parent)) {
          this.toast.add({ severity: 'warn', summary: 'Eliminado', detail: `${parent.name} eliminado.` });
        }
      },
    });
  }

  /* ══════════════ Child CRUD (standalone) ══════════════ */
  private emptyChildForm(): ChildForm {
    return { id: null, name: '', grade: '', parentId: null, boardingStatus: 'EN_ESPERA', active: true, hasPhoto: false };
  }

  protected openAddChild(): void {
    this.childForm = this.emptyChildForm();
    this.childHasPhoto.set(false);
    this.childDialogTitle = 'Nuevo Alumno';
    this.dialogRef = this.dialog.open(this.childDialogTpl(), { width: '400px', autoFocus: false });
  }

  protected openEditChild(child: Child): void {
    this.childForm = {
      id: child.id, name: child.name, grade: child.grade, parentId: child.parentId,
      boardingStatus: child.boardingStatus, active: child.active, hasPhoto: child.hasPhoto,
    };
    this.childHasPhoto.set(child.hasPhoto);
    this.childDialogTitle = 'Editar Alumno';
    this.dialogRef = this.dialog.open(this.childDialogTpl(), { width: '400px', autoFocus: false });
  }

  protected uploadPhotoMock(): void {
    this.toast.add({ severity: 'info', summary: 'Subiendo foto...', life: 1000 });
    setTimeout(() => {
      this.childForm.hasPhoto = true;
      this.childHasPhoto.set(true);
      this.toast.add({ severity: 'success', summary: 'Foto guardada', life: 2000 });
    }, 1000);
  }

  protected async saveChild(): Promise<void> {
    const form = this.childForm;
    if (!form.name) {
      this.toast.add({ severity: 'error', summary: 'Error', detail: 'El nombre del alumno es obligatorio.' });
      return;
    }
    if (this.store.children().some(c => c.name === form.name && String(c.id) !== String(form.id))) {
      this.toast.add({ severity: 'error', summary: 'Error', detail: 'El alumno ya existe.' });
      return;
    }
    const isNew = form.id === null;
    const saved = await this.store.saveChild(new Child({ ...form, organizationId: this.iamStore.organizationId() }));
    if (!saved) {
      this.toast.add({ severity: 'error', summary: 'Error', detail: 'No se pudo guardar el alumno.' });
      return;
    }
    this.toast.add({ severity: 'success', summary: isNew ? 'Registrado' : 'Actualizado', detail: isNew ? 'Alumno registrado.' : 'Alumno actualizado.' });
    this.closeDialog();
  }

  protected deleteChild(child: Child): void {
    this.confirm.require({
      message: `¿Eliminar al alumno ${child.name}?`,
      header: 'Confirmar eliminación',
      icon: 'pi pi-exclamation-triangle',
      acceptSeverity: 'danger',
      accept: async () => {
        if (await this.store.deleteChild(child)) {
          this.toast.add({ severity: 'warn', summary: 'Eliminado', detail: `${child.name} eliminado.` });
        }
      },
    });
  }

  protected showCarne(child: Child): void {
    this.carneData = child;
    this.dialogRef = this.dialog.open(this.carneDialogTpl(), { width: '320px', autoFocus: false });
  }

  /* ══════════════ Logistics (drivers / fleet) ══════════════ */
  private emptyLogForm(): LogForm {
    return { id: null, nameOrPlate: '', licenseOrModel: '', vehicleId: null, capacity: 0, active: true, licenseVerified: false };
  }

  protected openLogDrawer(): void {
    this.logForm = this.emptyLogForm();
    this.licenseVerified.set(false);
    this.logDrawerTitle = this.logTab() === 'drivers' ? 'Nuevo Conductor' : 'Nuevo Vehículo';
    this.dialogRef = this.dialog.open(this.logDrawerTpl(), { ...DRAWER_CONFIG, width: '40vw', minWidth: '320px' });
  }

  protected openEditDriver(driver: Driver): void {
    this.logForm = {
      id: driver.id, nameOrPlate: driver.fullName, licenseOrModel: driver.licenseNumber,
      vehicleId: driver.vehicleId, capacity: 0, active: driver.active, licenseVerified: false,
    };
    this.licenseVerified.set(false);
    this.logDrawerTitle = 'Editar Conductor';
    this.dialogRef = this.dialog.open(this.logDrawerTpl(), { ...DRAWER_CONFIG, width: '40vw', minWidth: '320px' });
  }

  protected openEditVehicle(vehicle: Vehicle): void {
    this.logForm = {
      id: vehicle.id, nameOrPlate: vehicle.plate, licenseOrModel: vehicle.model,
      vehicleId: null, capacity: vehicle.capacity, active: vehicle.active, licenseVerified: false,
    };
    this.logDrawerTitle = 'Editar Vehículo';
    this.dialogRef = this.dialog.open(this.logDrawerTpl(), { ...DRAWER_CONFIG, width: '40vw', minWidth: '320px' });
  }

  protected uploadLicenseMock(): void {
    this.toast.add({ severity: 'info', summary: 'Subiendo archivo...', detail: 'Validando documento con MTC', life: 2000 });
    setTimeout(() => {
      this.logForm.licenseVerified = true;
      this.licenseVerified.set(true);
      this.toast.add({ severity: 'success', summary: 'Verificado', detail: 'Licencia validada exitosamente.' });
    }, 2000);
  }

  protected async saveLog(): Promise<void> {
    const form = this.logForm;
    if (!form.nameOrPlate) {
      this.toast.add({ severity: 'error', summary: 'Error', detail: 'Complete los campos obligatorios.' });
      return;
    }
    const isNew = form.id === null;
    const orgId = this.iamStore.organizationId();

    if (this.logTab() === 'drivers') {
      const duplicate = this.store.drivers().some(d =>
        (d.licenseNumber === form.licenseOrModel || d.fullName === form.nameOrPlate) && String(d.id) !== String(form.id));
      if (duplicate) {
        this.toast.add({ severity: 'error', summary: 'Error', detail: 'Usuario ya existe (nombre o licencia duplicada).' });
        return;
      }
      const existing = this.store.drivers().find(d => String(d.id) === String(form.id));
      const saved = await this.store.saveDriver(new Driver({
        id: form.id, userId: existing?.userId ?? null, fullName: form.nameOrPlate, phone: existing?.phone ?? '',
        licenseNumber: form.licenseOrModel, vehicleId: form.vehicleId, active: form.active, organizationId: orgId,
      }));
      if (!saved) { this.toast.add({ severity: 'error', summary: 'Error', detail: 'No se pudo guardar el conductor.' }); return; }
      this.toast.add({ severity: 'success', summary: isNew ? 'Registrado' : 'Actualizado', detail: isNew ? 'Conductor registrado.' : 'Conductor actualizado.' });
    } else {
      if (this.fleetStore.vehicles().some(v => v.plate === form.nameOrPlate && String(v.id) !== String(form.id))) {
        this.toast.add({ severity: 'error', summary: 'Error', detail: 'Vehículo ya existe con esta placa.' });
        return;
      }
      const saved = await this.fleetStore.saveVehicle(new Vehicle({
        id: form.id, plate: form.nameOrPlate, model: form.licenseOrModel,
        capacity: Number(form.capacity) || 0, active: form.active, organizationId: orgId,
      }));
      if (!saved) { this.toast.add({ severity: 'error', summary: 'Error', detail: 'No se pudo guardar el vehículo.' }); return; }
      this.toast.add({ severity: 'success', summary: isNew ? 'Registrado' : 'Actualizado', detail: isNew ? 'Vehículo registrado.' : 'Vehículo actualizado.' });
    }
    this.closeDialog();
  }

  protected deleteDriver(driver: Driver): void {
    this.confirm.require({
      message: `¿Eliminar al conductor ${driver.fullName}?`,
      header: 'Confirmar eliminación',
      icon: 'pi pi-exclamation-triangle',
      acceptSeverity: 'danger',
      accept: async () => {
        if (await this.store.deleteDriver(driver)) this.toast.add({ severity: 'warn', summary: 'Eliminado', detail: 'Registro eliminado.' });
      },
    });
  }

  protected deleteVehicle(vehicle: Vehicle): void {
    this.confirm.require({
      message: `¿Eliminar el vehículo ${vehicle.plate}?`,
      header: 'Confirmar eliminación',
      icon: 'pi pi-exclamation-triangle',
      acceptSeverity: 'danger',
      accept: async () => {
        if (await this.fleetStore.deleteVehicle(vehicle.id!)) this.toast.add({ severity: 'warn', summary: 'Eliminado', detail: 'Registro eliminado.' });
      },
    });
  }
}
