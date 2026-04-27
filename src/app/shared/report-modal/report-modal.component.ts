import {
  Component, EventEmitter, Input, Output, signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ReportService } from '../../core/services/report.service';
import { ReportType } from '../../core/models/report.model';

@Component({
  selector: 'app-report-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './report-modal.component.html',
  styleUrls: ['./report-modal.component.css'],
})
export class ReportModalComponent {

  @Input() userRole: 'FREELANCER' | 'COMPANY' = 'FREELANCER';
  @Output() closed = new EventEmitter<void>();
  @Output() submitted = new EventEmitter<void>();

  readonly REPORT_TYPES: { value: ReportType; label: string }[] = [
    { value: 'FRAUDE',                label: 'Fraude / Arnaque' },
    { value: 'COMPORTEMENT',          label: 'Comportement inapproprié' },
    { value: 'PAIEMENT',              label: 'Problème de paiement' },
    { value: 'DOCUMENT_FALSIFIE',     label: 'Document falsifié' },
    { value: 'HORS_SUJET',            label: 'Contenu hors-sujet / Spam' },
    { value: 'BUG_TECHNIQUE',         label: 'Bug technique / Problème d\'affichage' },
    { value: 'PROBLEME_NOTIFICATION', label: 'Problème de notifications' },
    { value: 'PROBLEME_MESSAGERIE',   label: 'Problème de messagerie' },
    { value: 'ACCES_FONCTIONNALITE',  label: 'Accès refusé à une fonctionnalité' },
    { value: 'CONTENU_INAPPROPRIE',   label: 'Contenu inapproprié' },
    { value: 'COMPTE_INJUSTE',        label: 'Suspension de compte injuste' },
    { value: 'AUTRE',                 label: 'Autre' },
  ];

  type        = signal<ReportType>('BUG_TECHNIQUE');
  customType  = signal('');
  description = signal('');

  submitting = signal(false);
  error      = signal('');
  success    = signal(false);

  constructor(private reportService: ReportService) {}

  submit() {
    if (!this.type() || !this.description().trim()) {
      this.error.set('Veuillez remplir tous les champs obligatoires.');
      return;
    }
    if (this.type() === 'AUTRE' && !this.customType().trim()) {
      this.error.set('Veuillez préciser le problème dans le champ "Autre".');
      return;
    }
    this.error.set('');
    this.submitting.set(true);
    this.reportService.createReport({
      type: this.type(),
      customType: this.type() === 'AUTRE' ? this.customType().trim() : undefined,
      description: this.description(),
    }).subscribe({
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
        this.error.set('Une erreur est survenue. Veuillez réessayer.');
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
