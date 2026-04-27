import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../../core/services/admin.service';
import { Company, Freelancer } from '../../../core/models/user.model';

type UserTab = 'freelancers' | 'companies';

interface BanTarget {
  id: string;
  name: string;
  type: UserTab;
}

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-users.component.html',
  styleUrls: ['./admin-users.component.css'],
})
export class AdminUsersComponent implements OnInit {
  activeTab = signal<UserTab>('freelancers');
  freelancers = signal<Freelancer[]>([]);
  companies = signal<Company[]>([]);
  loading = signal(false);
  searchQuery = signal('');
  toastMessage = signal<{ text: string; type: 'success' | 'error' } | null>(null);
  showDeleteModal = signal<{ id: string; name: string; type: UserTab } | null>(null);
  showBanModal = signal<BanTarget | null>(null);
  banReason = '';

  filteredFreelancers = computed(() => {
    const q = this.searchQuery().toLowerCase();
    return this.freelancers().filter(f =>
      !q || `${f.firstName} ${f.lastName} ${f.email}`.toLowerCase().includes(q)
    );
  });

  filteredCompanies = computed(() => {
    const q = this.searchQuery().toLowerCase();
    return this.companies().filter(c =>
      !q || `${c.companyName} ${c.email}`.toLowerCase().includes(q)
    );
  });

  constructor(private adminService: AdminService) {}

  ngOnInit() {
    this.loadAll();
  }

  loadAll() {
    this.loading.set(true);
    this.adminService.getAllFreelancers().subscribe({ next: d => this.freelancers.set(d) });
    this.adminService.getAllCompanies().subscribe({
      next: d => { this.companies.set(d); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  setTab(tab: UserTab) {
    this.activeTab.set(tab);
    this.searchQuery.set('');
  }

  requestBan(id: string, name: string, type: UserTab) {
    this.banReason = '';
    this.showBanModal.set({ id, name, type });
  }

  executeBan() {
    const target = this.showBanModal();
    if (!target) return;
    const obs = target.type === 'freelancers'
      ? this.adminService.toggleFreelancerBan(target.id, this.banReason)
      : this.adminService.toggleCompanyBan(target.id, this.banReason);
    obs.subscribe({
      next: (res) => {
        this.showToast(res.message, 'success');
        this.showBanModal.set(null);
        this.loadAll();
      },
      error: () => this.showToast('Action failed', 'error'),
    });
  }

  toggleFreelancerBan(f: Freelancer) {
    if (f.isActive) {
      this.requestBan(f.id, `${f.firstName} ${f.lastName}`, 'freelancers');
    } else {
      this.adminService.toggleFreelancerBan(f.id).subscribe({
        next: (res) => { this.showToast(res.message, 'success'); this.loadAll(); },
        error: () => this.showToast('Action failed', 'error'),
      });
    }
  }

  toggleCompanyBan(c: Company) {
    if (c.isActive) {
      this.requestBan(c.id, c.companyName, 'companies');
    } else {
      this.adminService.toggleCompanyBan(c.id).subscribe({
        next: (res) => { this.showToast(res.message, 'success'); this.loadAll(); },
        error: () => this.showToast('Action failed', 'error'),
      });
    }
  }

  confirmDelete(id: string, name: string, type: UserTab) {
    this.showDeleteModal.set({ id, name, type });
  }

  executeDelete() {
    const modal = this.showDeleteModal();
    if (!modal) return;
    const obs = modal.type === 'freelancers'
      ? this.adminService.deleteFreelancer(modal.id)
      : this.adminService.deleteCompany(modal.id);

    obs.subscribe({
      next: () => {
        this.showToast('User deleted', 'success');
        this.showDeleteModal.set(null);
        this.loadAll();
      },
      error: () => this.showToast('Delete failed', 'error'),
    });
  }

  private showToast(text: string, type: 'success' | 'error') {
    this.toastMessage.set({ text, type });
    setTimeout(() => this.toastMessage.set(null), 3000);
  }
}
