import { Component, OnInit, signal, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { MissionTranslationService } from '../../core/services/mission-translation.service';
import { SavedMissionsService } from '../../core/services/saved-missions.service';
import { ApplicationService } from '../../core/services/application.service';
import { ToastService } from '../../core/services/toast.service';
import { Mission } from '../../core/models/mission.model';
import { environment } from '../../../environments/environment';

import { Subscription } from 'rxjs';

@Component({
  selector: 'app-saved-missions',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './saved-missions.component.html',
  styleUrl: './saved-missions.component.css',
})
export class SavedMissionsComponent implements OnInit, OnDestroy{
  missions = signal<Mission[]>([]);
  loading  = signal(true);

  private langSub?: Subscription;

  private readonly APP_STATUS_CACHE_KEY = 'wl_app_status_cache';
  private readonly ACCEPTED_AT_KEY = 'wl_accepted_missions';
  private readonly HIDE_AFTER_MS = 60 * 60 * 1000;
  applicationStatusMap = new Map<string, 'PENDING' | 'ACCEPTED' | 'REJECTED'>();

  constructor(
    public savedMissionsService: SavedMissionsService,
    private applicationService: ApplicationService,
    private toastService: ToastService,
    public router: Router,
    private translate: TranslateService,
    private missionTranslation: MissionTranslationService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.langSub = this.translate.onLangChange.subscribe(() => this.cdr.markForCheck());
    this.savedMissionsService.load();
    this.loading.set(true);
    this.savedMissionsService.getSavedMissions().subscribe({
      next: async (missions) => {
        const filtered = missions.filter(m => !m.id || !this.isHiddenBecauseAccepted(m.id));
        this.missions.set(filtered);
        this.loading.set(false);
        const lang = this.missionTranslation.getCurrentLang();
        if (lang === 'fr' && filtered.length > 0) {
          // Sequential to respect MyMemory rate limits
          const translated: any[] = [];
          for (const m of filtered) {
            translated.push(await this.missionTranslation.translateMissionFields(m, 'fr'));
          }
          this.missions.set(translated);
        }
      },
      error: () => this.loading.set(false),
    });

    // Restore from cache immediately, then refresh from API
    this.restoreStatusCache();
    this.applicationService.getMyApplications().subscribe({
      next: (applications) => {
        this.applicationStatusMap.clear();
        const acceptedAtMap = this.getAcceptedAtMap();
        for (const app of applications) {
          if (app.status !== 'WITHDRAWN') {
            this.applicationStatusMap.set(app.missionId, app.status as 'PENDING' | 'ACCEPTED' | 'REJECTED');
            if (app.status === 'ACCEPTED' && !acceptedAtMap.has(app.missionId)) {
              acceptedAtMap.set(app.missionId, (app as any).updatedAt ?? new Date().toISOString());
              this.saveAcceptedAtMap(acceptedAtMap);
            }
          }
        }
        // Filter out missions hidden due to acceptance > 1h
        this.missions.update(list => list.filter(m => !m.id || !this.isHiddenBecauseAccepted(m.id)));
      },
    });
  }

  private restoreStatusCache(): void {
    try {
      const raw = localStorage.getItem(this.APP_STATUS_CACHE_KEY);
      if (raw) {
        const entries: [string, 'PENDING' | 'ACCEPTED' | 'REJECTED'][] = JSON.parse(raw);
        this.applicationStatusMap = new Map(entries);
      }
    } catch { /* ignore */ }
  }

  private getAcceptedAtMap(): Map<string, string> {
    try {
      const raw = localStorage.getItem(this.ACCEPTED_AT_KEY);
      if (raw) return new Map(JSON.parse(raw));
    } catch { /* ignore */ }
    return new Map();
  }

  private saveAcceptedAtMap(map: Map<string, string>): void {
    try {
      localStorage.setItem(this.ACCEPTED_AT_KEY, JSON.stringify(Array.from(map.entries())));
    } catch { /* ignore */ }
  }

  isHiddenBecauseAccepted(missionId: string): boolean {
    const map = this.getAcceptedAtMap();
    const acceptedAt = map.get(missionId);
    if (!acceptedAt) return false;
    return Date.now() - new Date(acceptedAt).getTime() >= this.HIDE_AFTER_MS;
  }

  getApplicationStatus(missionId: string | undefined): 'PENDING' | 'ACCEPTED' | 'REJECTED' | null {
    if (!missionId) return null;
    return this.applicationStatusMap.get(missionId) ?? null;
  }

  unsave(missionId: string): void {
    this.savedMissionsService.toggle(missionId).subscribe({
      next: () => {
        this.missions.update(list => list.filter(m => m.id !== missionId));
        this.toastService.show(this.translate.instant('saved_page.unsave_toast'), 'success');
      },
    });
  }

  applyNow(missionId: string | undefined): void {
    if (missionId) this.router.navigate(['/apply', missionId]);
  }

  getFileUrl(path: string | null | undefined): string {
    if (!path) return '';
    return environment.apiUrl.replace(/\/api$/, '') + path;
  }

  formatDate(dateStr: string | undefined): string {
    if (!dateStr) return '—';
    const locale = this.translate.currentLang === 'fr' ? 'fr-FR' : 'en-GB';
    return new Date(dateStr).toLocaleDateString(locale, {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  }

  getSkills(skills: string | undefined): string[] {
    if (!skills) return [];
    return skills.replace(/<[^>]*>/g, '').split(/[,;]+/).map(s => s.trim()).filter(Boolean).slice(0, 5);
  }

  isDeadlinePassed(mission: Mission): boolean {
    if (!mission.applicationDeadline) return false;
    return new Date(mission.applicationDeadline) < new Date();
  }

  ngOnDestroy(): void {
    this.langSub?.unsubscribe();
  }
}
