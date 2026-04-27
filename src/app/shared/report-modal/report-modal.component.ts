import {
  Component, EventEmitter, Input, OnInit, Output, computed, signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ReportService } from '../../core/services/report.service';
import { ContractService } from '../../core/services/contract.service';
import { FreelancerService } from '../../core/services/freelancer.service';
import { CompanyService } from '../../core/services/company.service';
import { ReportType } from '../../core/models/report.model';
import { Contract } from '../../core/models/contract.model';

interface PartyOption { id: string; name: string; role: string; }

@Component({
  selector: 'app-report-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './report-modal.component.html',
  styleUrls: ['./report-modal.component.css'],
})
export class ReportModalComponent implements OnInit {

  @Input() userRole: 'FREELANCER' | 'COMPANY' = 'FREELANCER';
  @Output() closed = new EventEmitter<void>();
  @Output() submitted = new EventEmitter<void>();

  readonly REPORT_TYPES: { value: ReportType; label: string }[] = [
    { value: 'FRAUDE',            label: 'Fraude' },
    { value: 'COMPORTEMENT',      label: 'Comportement inapproprié' },
    { value: 'PAIEMENT',          label: 'Problème de paiement' },
    { value: 'DOCUMENT_FALSIFIE', label: 'Document falsifié' },
    { value: 'HORS_SUJET',        label: 'Hors-sujet / Spam' },
  ];

  type              = signal<ReportType>('FRAUDE');
  reportedAgainstId = signal('');
  contractId        = signal('');
  description       = signal('');

  parties   = signal<PartyOption[]>([]);
  contracts = signal<Contract[]>([]);
  loading   = signal(false);
  submitting = signal(false);
  error     = signal('');
  success   = signal(false);

  // Only show contracts linked to the selected party
  filteredContracts = computed(() => {
    const targetId = this.reportedAgainstId();
    if (!targetId) return [];
    return this.contracts().filter(c =>
      this.userRole === 'FREELANCER'
        ? c.companyId === targetId
        : c.freelancerId === targetId
    );
  });

  constructor(
    private reportService: ReportService,
    private contractService: ContractService,
    private freelancerService: FreelancerService,
    private companyService: CompanyService,
  ) {}

  ngOnInit() {
    this.loadContracts();
    this.loadParties();
  }

  private loadContracts() {
    const obs = this.userRole === 'FREELANCER'
      ? this.contractService.getFreelancerContracts()
      : this.contractService.getCompanyContracts();
    obs.subscribe({ next: (cs) => this.contracts.set(cs), error: () => {} });
  }

  private loadParties() {
    this.loading.set(true);
    if (this.userRole === 'FREELANCER') {
      this.companyService.getAllCompanies().subscribe({
        next: (list: any[]) => {
          this.parties.set(list.map(c => ({ id: c.id, name: c.companyName, role: 'COMPANY' })));
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
    } else {
      this.freelancerService.getAllFreelancers().subscribe({
        next: (list: any[]) => {
          this.parties.set(list.map(f => ({ id: f.id, name: `${f.firstName} ${f.lastName}`, role: 'FREELANCER' })));
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
    }
  }

  onPartyChange(id: string) {
    this.reportedAgainstId.set(id);
    // Reset contract selection when party changes
    this.contractId.set('');
  }

  submit() {
    if (!this.type() || !this.reportedAgainstId() || !this.description().trim()) {
      this.error.set('Veuillez remplir tous les champs obligatoires.');
      return;
    }
    this.error.set('');
    this.submitting.set(true);
    this.reportService.createReport({
      type: this.type(),
      reportedAgainstId: this.reportedAgainstId(),
      contractId: this.contractId() || undefined,
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
