import { Component, input, output } from '@angular/core';
import { GLOSSARY } from '../glossary';
import { ConfirmSheet } from '../ui/confirm-sheet';

/** Shared save / discard confirmation sheets (N-3). */
@Component({
  selector: 'app-confirm-save-dialog',
  imports: [ConfirmSheet],
  template: `
    <app-confirm-sheet
      [open]="saveOpen()"
      [title]="saveTitle()"
      [message]="saveMessage()"
      [confirmLabel]="saveConfirmLabel()"
      [cancelLabel]="saveCancelLabel()"
      [busy]="saveBusy()"
      (confirm)="saveConfirm.emit()"
      (cancel)="saveCancel.emit()"
    />
    <app-confirm-sheet
      [open]="discardOpen()"
      title="ละทิ้งการเปลี่ยนแปลง?"
      message="ข้อมูลที่แก้ไขจะไม่ถูกบันทึก"
      confirmLabel="ละทิ้ง"
      cancelLabel="ยกเลิก"
      [danger]="true"
      (confirm)="discardConfirm.emit()"
      (cancel)="discardCancel.emit()"
    />
  `,
})
export class ConfirmSaveDialog {
  readonly saveOpen = input(false);
  readonly saveTitle = input<string>(GLOSSARY.saveChangesTitle);
  readonly saveMessage = input('');
  readonly saveConfirmLabel = input<string>(GLOSSARY.saveChangesConfirm);
  readonly saveCancelLabel = input<string>(GLOSSARY.saveChangesCancel);
  readonly saveBusy = input(false);
  readonly discardOpen = input(false);

  readonly saveConfirm = output<void>();
  readonly saveCancel = output<void>();
  readonly discardConfirm = output<void>();
  readonly discardCancel = output<void>();
}
