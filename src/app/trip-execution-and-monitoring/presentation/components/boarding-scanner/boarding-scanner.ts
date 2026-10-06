import { AfterViewInit, Component, OnDestroy, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { Html5Qrcode } from 'html5-qrcode';
import { ToastService } from '../../../../shared/application/toast.service';

export interface BoardingScannerData {
  /** Students that belong to the trip; a QR must encode one of these ids. */
  students: { id: string; name: string }[];
}

/**
 * Camera/QR scanning component used by the driver to register boarding during an active trip.
 * Closes with the matched student id (US-11.S2) or null; unknown codes raise a toast (US-11.S3).
 */
@Component({
  selector: 'kt-boarding-scanner',
  imports: [MatButtonModule, MatDialogModule],
  template: `
    <div class="kt-dialog-header">
      <h3>📷 Escanear QR de Alumno</h3>
      <button mat-icon-button (click)="close(null)"><i class="pi pi-times"></i></button>
    </div>
    <div class="kt-dialog-body">
      <p class="qr-hint">Apunta la cámara al código QR del carnet del alumno.</p>
      <div id="qr-reader" class="qr-reader-box"></div>
      @if (scanning()) {
        <p class="qr-scanning-label"><i class="pi pi-spin pi-spinner"></i> Escaneando…</p>
      }
    </div>
    <div class="kt-dialog-footer">
      <button mat-button (click)="close(null)">Cancelar</button>
    </div>
  `,
  styles: `
    .qr-reader-box {
      width: 100%; min-height: 300px;
      border-radius: 10px;
      /* no overflow:hidden — html5-qrcode injects overlay divs that must be visible */
      background: #000;
      position: relative;
    }
    .qr-hint { font-size: 0.82rem; color: var(--muted); margin: 0 0 0.75rem; }
    .qr-scanning-label {
      text-align: center; font-size: 0.78rem; font-weight: 600;
      color: #1d4ed8; margin: 0.5rem 0 0;
      display: flex; align-items: center; justify-content: center; gap: 0.35rem;
    }
  `,
})
export class BoardingScanner implements AfterViewInit, OnDestroy {
  private readonly data = inject<BoardingScannerData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject<MatDialogRef<BoardingScanner, string | null>>(MatDialogRef);
  private readonly toast = inject(ToastService);

  protected readonly scanning = signal(false);
  private scanner: Html5Qrcode | null = null;
  private errorCooldown = false;
  private handled = false;

  async ngAfterViewInit(): Promise<void> {
    try {
      this.scanner = new Html5Qrcode('qr-reader');
      this.scanning.set(true);
      await this.scanner.start(
        { facingMode: 'environment' },
        { fps: 30, qrbox: { width: 220, height: 220 } },
        decodedText => this.onScan(decodedText),
        () => { /* ignore per-frame decode errors */ },
      );
    } catch {
      this.scanning.set(false);
      this.toast.add({ severity: 'warn', summary: 'Cámara no disponible', detail: 'No se pudo acceder a la cámara del dispositivo.', life: 3500 });
      void this.close(null);
    }
  }

  ngOnDestroy(): void {
    void this.stopScanner();
  }

  protected async close(result: string | null): Promise<void> {
    await this.stopScanner();
    this.dialogRef.close(result);
  }

  private onScan(decodedText: string): void {
    if (this.handled) return;
    const matched = this.data.students.find(s => s.id === decodedText);
    if (matched) {
      this.handled = true;
      void this.close(matched.id);
      return;
    }
    if (this.errorCooldown) return;
    this.errorCooldown = true;
    this.toast.add({ severity: 'error', summary: 'Alumno no encontrado', detail: 'El QR escaneado no corresponde a ningún alumno de este viaje.' });
    setTimeout(() => (this.errorCooldown = false), 3000);
  }

  private async stopScanner(): Promise<void> {
    const scanner = this.scanner;
    this.scanner = null;
    if (scanner && this.scanning()) {
      try { await scanner.stop(); scanner.clear(); } catch { /* already stopped */ }
    }
    this.scanning.set(false);
  }
}
