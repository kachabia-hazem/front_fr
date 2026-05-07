import { Component, OnInit, signal, computed, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { MissionService } from '../../../core/services/mission.service';

import { Subscription } from 'rxjs';

@Component({
  selector: 'app-admin-missions',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule],
  templateUrl: './admin-missions.component.html',
  styleUrls: ['./admin-missions.component.css'],
})
export class AdminMissionsComponent implements OnInit, OnDestroy{
  missions = signal<any[]>([]);
  loading = signal(true);
  searchQuery = signal('');
  statusFilter = signal<string>('ALL');

  deleteTarget = signal<any | null>(null);
  deleteReason = signal('');
  deleting = signal(false);

  private langSub?: Subscription;

  readonly STATUS_TABS = ['ALL', 'OPEN', 'IN_PROGRESS', 'CLOSED', 'CANCELLED'];

  filteredMissions = computed(() => {
    const q = this.searchQuery().toLowerCase();
    const s = this.statusFilter();
    return this.missions()
      .filter(m => {
        const matchQ = !q || `${m.jobTitle} ${m.field} ${m.location}`.toLowerCase().includes(q);
        const matchS = s === 'ALL' || m.status === s;
        return matchQ && matchS;
      })
      .sort((a, b) => {
        const da = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const db = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return db - da;
      });
  });

  constructor(
    private missionService: MissionService,
    private translate: TranslateService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.langSub = this.translate.onLangChange.subscribe(() => this.cdr.markForCheck()); this.loadMissions(); }

  private loadMissions() {
    this.loading.set(true);
    this.missionService.adminGetAllMissions().subscribe({
      next: (data) => { this.missions.set(data); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  openDeleteModal(m: any) {
    this.deleteTarget.set(m);
    this.deleteReason.set('');
  }

  closeDeleteModal() {
    this.deleteTarget.set(null);
    this.deleteReason.set('');
  }

  confirmDelete() {
    const target = this.deleteTarget();
    if (!target || !this.deleteReason().trim()) return;
    this.deleting.set(true);
    this.missionService.adminDeleteMission(target.id, this.deleteReason()).subscribe({
      next: () => {
        this.missions.update(list => list.filter(m => m.id !== target.id));
        this.deleting.set(false);
        this.closeDeleteModal();
      },
      error: () => this.deleting.set(false),
    });
  }

  tabLabel(s: string): string {
    return this.translate.instant('admin_missions.tab_' + s.toLowerCase());
  }

  statusLabel(s: string): string {
    return this.translate.instant('admin_missions.status_' + s.toLowerCase());
  }

  ngOnDestroy(): void {
    this.langSub?.unsubscribe();
  }
}
