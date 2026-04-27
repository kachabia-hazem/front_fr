import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MissionService } from '../../../core/services/mission.service';

@Component({
  selector: 'app-admin-missions',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-missions.component.html',
  styleUrls: ['./admin-missions.component.css'],
})
export class AdminMissionsComponent implements OnInit {
  missions = signal<any[]>([]);
  loading = signal(true);
  searchQuery = signal('');
  statusFilter = signal<string>('ALL');

  deleteTarget = signal<any | null>(null);
  deleteReason = signal('');
  deleting = signal(false);

  filteredMissions = computed(() => {
    const q = this.searchQuery().toLowerCase();
    const s = this.statusFilter();
    return this.missions().filter(m => {
      const matchQ = !q || `${m.jobTitle} ${m.field} ${m.location}`.toLowerCase().includes(q);
      const matchS = s === 'ALL' || m.status === s;
      return matchQ && matchS;
    });
  });

  constructor(private missionService: MissionService) {}

  ngOnInit() {
    this.loadMissions();
  }

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
}
