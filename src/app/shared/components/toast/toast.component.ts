import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (toastService.toast(); as t) {
      <div class="toast" [class]="'toast toast-' + t.type" (click)="toastService.dismiss()">
        <div class="toast-icon">
          @if (t.type === 'warning') {
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          } @else if (t.type === 'error') {
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
          } @else if (t.type === 'success') {
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          } @else {
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
          }
        </div>
        <span class="toast-message">{{ t.message }}</span>
        <button class="toast-close">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
    }
  `,
  styles: [`
    .toast {
      position: fixed;
      top: 24px;
      right: 24px;
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 14px 20px;
      border-radius: 12px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.15);
      z-index: 10000;
      cursor: pointer;
      animation: slideIn 0.3s ease;
      max-width: 420px;
      font-family: inherit;
    }
    @keyframes slideIn {
      from { opacity: 0; transform: translateX(40px); }
      to { opacity: 1; transform: translateX(0); }
    }
    .toast-warning {
      background: #fffbeb;
      border: 1px solid #f59e0b;
      color: #92400e;
    }
    .toast-error {
      background: #fef2f2;
      border: 1px solid #ef4444;
      color: #991b1b;
    }
    .toast-success {
      background: #ecfdf5;
      border: 1px solid #10b981;
      color: #065f46;
    }
    .toast-info {
      background: #eff6ff;
      border: 1px solid #3b82f6;
      color: #1e40af;
    }
    .toast-icon { flex-shrink: 0; display: flex; }
    .toast-message { font-size: 0.88rem; font-weight: 500; line-height: 1.4; }
    .toast-close {
      flex-shrink: 0;
      background: none;
      border: none;
      cursor: pointer;
      opacity: 0.5;
      padding: 0;
      display: flex;
      color: inherit;
    }
    .toast-close:hover { opacity: 1; }
  `]
})
export class ToastComponent {
  constructor(public toastService: ToastService) {}
}
