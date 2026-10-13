import { Injectable, signal } from '@angular/core';

export interface ToastMessage {
  id: number;
  type: 'success' | 'error';
  title: string;
  message: string;
}

export interface ConfirmationDialog {
  title: string;
  message: string;
  confirmLabel: string;
  tone: 'danger' | 'primary';
}

@Injectable({ providedIn: 'root' })
export class FeedbackService {
  readonly toasts = signal<ToastMessage[]>([]);
  readonly confirmation = signal<ConfirmationDialog | null>(null);
  private nextId = 1;
  private confirmationResolver: ((confirmed: boolean) => void) | null = null;

  success(message: string, title = 'Success'): void {
    this.show('success', title, message);
  }
  error(message: string, title = 'Something went wrong'): void {
    this.show('error', title, message);
  }

  dismiss(id: number): void {
    this.toasts.update((items) => items.filter((item) => item.id !== id));
  }

  confirm(
    dialog: Omit<ConfirmationDialog, 'tone'> & { tone?: ConfirmationDialog['tone'] },
  ): Promise<boolean> {
    this.resolveConfirmation(false);
    this.confirmation.set({ ...dialog, tone: dialog.tone || 'primary' });
    return new Promise<boolean>((resolve) => {
      this.confirmationResolver = resolve;
    });
  }

  resolveConfirmation(confirmed: boolean): void {
    this.confirmation.set(null);
    this.confirmationResolver?.(confirmed);
    this.confirmationResolver = null;
  }

  private show(type: ToastMessage['type'], title: string, message: string): void {
    const id = this.nextId++;
    this.toasts.update((items) => [...items.slice(-2), { id, type, title, message }]);
    window.setTimeout(() => this.dismiss(id), 4500);
  }
}
