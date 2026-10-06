import { Injectable, inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { ConfirmDialog, ConfirmOptions } from '../presentation/components/confirm-dialog/confirm-dialog';

/** Confirmation prompts (same API shape as PrimeVue's useConfirm). */
@Injectable({ providedIn: 'root' })
export class ConfirmService {
    private readonly dialog = inject(MatDialog);

    require(options: ConfirmOptions & { accept?: () => void | Promise<void>; reject?: () => void }): void {
        const { accept, reject, ...data } = options;
        this.dialog
            .open<ConfirmDialog, ConfirmOptions, boolean>(ConfirmDialog, { data, width: '440px', autoFocus: false })
            .afterClosed()
            .subscribe(confirmed => {
                if (confirmed) void accept?.();
                else reject?.();
            });
    }
}
