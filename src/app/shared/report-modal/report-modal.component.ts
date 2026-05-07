import {
  Component, EventEmitter, Input, Output, signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ReportService } from '../../core/services/report.service';
import { ReportType } from '../../core/models/report.model';

@Component({
  selector: 'app-report-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule],
  templateUrl: './report-modal.component.html',
  styleUrls: ['./report-modal.component.css'],
})
export class ReportModalComponent {

  @Input() userRole: 'FREELANCER' | 'COMPANY' = 'FREELANCER';
  @Input() reporterEmail?: string;
  @Output() closed = new EventEmitter<void>();
  @Output() submitted = new EventEmitter<void>();

  readonly REPORT_TYPES: { value: ReportType; labelKey: string }[] = [
    { value: 'FRAUDE',                labelKey: 'report_modal.type_fraude' },
    { value: 'COMPORTEMENT',          labelKey: 'report_modal.type_comportement' },
    { value: 'PAIEMENT',              labelKey: 'report_modal.type_paiement' },
    { value: 'DOCUMENT_FALSIFIE',     labelKey: 'report_modal.type_document_falsifie' },
    { value: 'HORS_SUJET',            labelKey: 'report_modal.type_hors_sujet' },
    { value: 'BUG_TECHNIQUE',         labelKey: 'report_modal.type_bug_technique' },
    { value: 'PROBLEME_NOTIFICATION', labelKey: 'report_modal.type_probleme_notification' },
    { value: 'PROBLEME_MESSAGERIE',   labelKey: 'report_modal.type_probleme_messagerie' },
    { value: 'ACCES_FONCTIONNALITE',  labelKey: 'report_modal.type_acces_fonctionnalite' },
    { value: 'CONTENU_INAPPROPRIE',   labelKey: 'report_modal.type_contenu_inapproprie' },
    { value: 'COMPTE_INJUSTE',        labelKey: 'report_modal.type_compte_injuste' },
    { value: 'AUTRE',                 labelKey: 'report_modal.type_autre' },
  ];

  type        = signal<ReportType>('BUG_TECHNIQUE');
  customType  = signal('');
  description = signal('');

  submitting = signal(false);
  error      = signal('');
  success    = signal(false);

  constructor(
    private reportService: ReportService,
    private translate: TranslateService,
  ) {}

  submit() {
    if (!this.type() || !this.description().trim()) {
      this.error.set(this.translate.instant('report_modal.error_required'));
      return;
    }
    if (this.type() === 'AUTRE' && !this.customType().trim()) {
      this.error.set(this.translate.instant('report_modal.error_autre'));
      return;
    }
    this.error.set('');
    this.submitting.set(true);
    const req = {
      type: this.type(),
      customType: this.type() === 'AUTRE' ? this.customType().trim() : undefined,
      description: this.description(),
    };
    const obs = this.reporterEmail
      ? this.reportService.createPublicReport(this.reporterEmail, req)
      : this.reportService.createReport(req);
    obs.subscribe({
      next: () => {
        this.submitting.set(false);
        this.success.set(true);
        setTimeout(() => {
          this.submitted.emit();
          this.close();
        }, 1800);
      },
      error: () => {
        this.submitting.set(false);
        this.error.set(this.translate.instant('report_modal.error_generic'));
      },
    });
  }

  close() { this.closed.emit(); }

  overlayClick(event: MouseEvent) {
    if ((event.target as HTMLElement).classList.contains('report-modal-overlay')) {
      this.close();
    }
  }
}
