import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { IamStore } from '../../../../identity-and-access-management/application/iam.store';
import { StakeholderStore } from '../../../../stakeholder-and-asset-management/application/stakeholder.store';

type AttendanceStatus = 'PRESENT' | 'LATE' | 'ABSENT';

interface AttendanceRecord {
  childId: string;
  childName: string;
  status: AttendanceStatus;
  checkIn: string | null;
  checkOut: string | null;
}

const MONTH_NAMES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const DAY_HEADERS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const STATUS_LABEL: Record<AttendanceStatus, string> = { PRESENT: 'Presente', LATE: 'Tarde', ABSENT: 'Ausente' };
const pad = (n: number) => String(n).padStart(2, '0');

/**
 * Parent's attendance history (US22): monthly calendar, day detail and monthly table
 * for the parent's children. Daily records are generated deterministically per child.
 */
@Component({
  selector: 'kt-attendance-history',
  templateUrl: './attendance-history.html',
  styleUrl: './attendance-history.css',
})
export class AttendanceHistory implements OnInit {
  private readonly iamStore = inject(IamStore);
  private readonly stakeholderStore = inject(StakeholderStore);

  protected readonly monthNames = MONTH_NAMES;
  protected readonly dayHeaders = DAY_HEADERS;
  private readonly today = new Date();

  protected readonly viewYear = signal(this.today.getFullYear());
  protected readonly viewMonth = signal(this.today.getMonth());
  protected readonly selectedDay = signal<number | null>(this.today.getDate());

  /** The signed-in parent's children (first three students when no parent profile matches). */
  private readonly myChildren = computed(() => {
    const parent = this.stakeholderStore.parentByEmail(this.iamStore.currentUser()?.email);
    return parent ? this.stakeholderStore.childrenOf(parent.id) : this.stakeholderStore.children().slice(0, 3);
  });

  protected readonly attendance = computed(() => {
    const records: Record<string, AttendanceRecord[]> = {};
    const year = this.viewYear();
    const month = this.viewMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    this.myChildren().forEach((child, ci) => {
      for (let d = 1; d <= daysInMonth; d++) {
        const date = new Date(year, month, d);
        const dow = date.getDay();
        if (dow === 0 || dow === 6 || date > this.today) continue; // weekends / future
        const seed = (ci * 31 + d * 7) % 10;
        const status: AttendanceStatus = seed < 7 ? 'PRESENT' : seed < 8 ? 'LATE' : 'ABSENT';
        const key = this.dayKey(d);
        (records[key] ??= []).push({
          childId: String(child.id),
          childName: child.name || `Alumno ${ci + 1}`,
          status,
          checkIn: status === 'PRESENT' ? '07:15' : status === 'LATE' ? `07:${pad(25 + (d % 15))}` : null,
          checkOut: status !== 'ABSENT' ? `14:${pad(30 + (d % 20))}` : null,
        });
      }
    });
    return records;
  });

  protected readonly calendarDays = computed(() => {
    const firstDow = new Date(this.viewYear(), this.viewMonth(), 1).getDay();
    const daysInMonth = new Date(this.viewYear(), this.viewMonth() + 1, 0).getDate();
    return [...Array<null>(firstDow).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  });

  protected readonly selectedRecords = computed(() => {
    const day = this.selectedDay();
    return day ? this.attendance()[this.dayKey(day)] ?? [] : [];
  });

  protected readonly canGoNext = computed(() =>
    !(this.viewYear() === this.today.getFullYear() && this.viewMonth() >= this.today.getMonth()));

  protected readonly stats = computed(() => {
    const all = Object.values(this.attendance()).flat();
    const present = all.filter(r => r.status === 'PRESENT').length;
    const late = all.filter(r => r.status === 'LATE').length;
    const absent = all.filter(r => r.status === 'ABSENT').length;
    const rate = all.length ? Math.round(((present + late) / all.length) * 100) : 0;
    return [
      { icon: 'pi pi-calendar', value: Object.keys(this.attendance()).length, label: 'Días registrados', color: '#1E3A63' },
      { icon: 'pi pi-check-circle', value: `${rate}%`, label: 'Tasa de presencia', color: '#22c55e' },
      { icon: 'pi pi-clock', value: late, label: 'Llegadas tarde', color: '#f59e0b' },
      { icon: 'pi pi-times-circle', value: absent, label: 'Ausencias', color: '#DE4A26' },
    ];
  });

  protected readonly tableRecords = computed(() =>
    Object.entries(this.attendance())
      .sort(([a], [b]) => b.localeCompare(a))
      .flatMap(([date, recs]) => recs.map(r => ({ date, ...r }))));

  ngOnInit(): void {
    void this.stakeholderStore.loadAll(this.iamStore.organizationId());
  }

  protected dayKey(d: number): string {
    return `${this.viewYear()}-${pad(this.viewMonth() + 1)}-${pad(d)}`;
  }

  protected dayDots(d: number): AttendanceStatus[] {
    return [...new Set((this.attendance()[this.dayKey(d)] ?? []).map(r => r.status))];
  }

  protected hasData(d: number): boolean {
    return (this.attendance()[this.dayKey(d)]?.length ?? 0) > 0;
  }

  protected dotColor(status: AttendanceStatus): string {
    return status === 'PRESENT' ? 'var(--green, #22c55e)' : status === 'LATE' ? '#f59e0b' : '#DE4A26';
  }

  protected statusLabel(status: AttendanceStatus): string {
    return STATUS_LABEL[status];
  }

  protected isToday(d: number): boolean {
    return d === this.today.getDate() && this.viewMonth() === this.today.getMonth() && this.viewYear() === this.today.getFullYear();
  }

  protected selectedTitle(): string {
    const day = this.selectedDay();
    return day ? `${pad(day)} ${MONTH_NAMES[this.viewMonth()]}` : 'Selecciona un día';
  }

  protected selectDay(d: number | null): void {
    if (d) this.selectedDay.set(d);
  }

  protected prevMonth(): void {
    if (this.viewMonth() === 0) { this.viewMonth.set(11); this.viewYear.update(y => y - 1); }
    else this.viewMonth.update(m => m - 1);
    this.selectedDay.set(1);
  }

  protected nextMonth(): void {
    if (!this.canGoNext()) return;
    if (this.viewMonth() === 11) { this.viewMonth.set(0); this.viewYear.update(y => y + 1); }
    else this.viewMonth.update(m => m + 1);
    this.selectedDay.set(1);
  }
}
