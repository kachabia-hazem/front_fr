import { Injectable, signal } from '@angular/core';

export interface Toast {
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  toast = signal<Toast | null>(null);
  private timeout: any = null;

  show(message: string, type: Toast['type'] = 'info', duration = 4000): void {
    if (this.timeout) clearTimeout(this.timeout);
    this.toast.set({ message, type });
    this.timeout = setTimeout(() => this.toast.set(null), duration);
  }

  dismiss(): void {
    if (this.timeout) clearTimeout(this.timeout);
    this.toast.set(null);
  }
}
