import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { Application } from '../../../core/models/application.model';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-application-details-modal',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './application-details-modal.component.html',
  styleUrls: ['./application-details-modal.component.css'],
})
export class ApplicationDetailsModalComponent {
  @Input({ required: true }) application!: Application;
  @Output() closed = new EventEmitter<void>();
  @Output() viewProfile = new EventEmitter<string>();

  close(): void {
    this.closed.emit();
  }

  overlayClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('appdet-overlay')) {
      this.close();
    }
  }

  onViewProfile(): void {
    this.viewProfile.emit(this.application.freelancerId);
  }

  getFileUrl(path: string | undefined): string {
    if (!path) return '';
    return environment.apiUrl.replace(/\/api$/, '') + path;
  }

  getInitials(first: string, last: string): string {
    return ((first?.charAt(0) || '') + (last?.charAt(0) || '')).toUpperCase();
  }

  getStatusClass(status: string): string {
    return 'status-' + status.toLowerCase();
  }

  formatDate(dateStr: string | undefined): string {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }
}
