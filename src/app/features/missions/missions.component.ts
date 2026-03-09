import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule, UpperCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { MissionService, AiSearchResult } from '../../core/services/mission.service';
import { FreelancerService } from '../../core/services/freelancer.service';
import { ApplicationService } from '../../core/services/application.service';
import { ToastService } from '../../core/services/toast.service';
import { Mission } from '../../core/models/mission.model';
import { AuthService } from '../../core/services/auth.service';
import { environment } from '../../../environments/environment';
import { getProfileCompletion } from '../../core/utils/profile-completion';
import { SECTOR_OPTIONS, SPECIALITY_OPTIONS, CATEGORY_OPTIONS } from '../../core/constants/mission-options';

@Component({
  selector: 'app-missions',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, UpperCasePipe],
  templateUrl: './missions.component.html',
  styleUrl: './missions.component.css',
})
export class MissionsComponent implements OnInit {
  missions: Mission[] = [];
  filteredMissions: Mission[] = [];
  loading = true;

  // Search
  searchQuery = '';
  locationQuery = '';

  // View mode
  viewMode: 'list' | 'grid' = 'list';

  // Tab
  activeTab: 'missions' | 'freelancers' = 'missions';

  // Filters
  tjmMin = 0;
  tjmMax = 1000;
  tjmRangeMin = 0;
  tjmRangeMax = 1000;
  histogramBuckets: number[] = [];
  readonly bucketCount = 20;

  employmentTypes = [
    { label: 'Full-time', value: 'Full-time', checked: false },
    { label: 'Part-time', value: 'Part-time', checked: false },
    { label: 'Remote', value: 'Remote', checked: false },
    { label: 'Freelance', value: 'Freelance', checked: false },
  ];

  categories = CATEGORY_OPTIONS.map(c => ({ ...c, checked: false }));
  showAllCategories = false;

  sectors = SECTOR_OPTIONS.map(s => ({ ...s, checked: false }));
  showAllSectors = false;

  specialities = SPECIALITY_OPTIONS.map(s => ({ ...s, checked: false }));
  showAllSpecialities = false;

  experienceLevels = [
    { label: '0-2 years', min: 0, max: 2, checked: false },
    { label: '3-7 years', min: 3, max: 7, checked: false },
    { label: '8-15 years', min: 8, max: 15, checked: false },
  ];

  // ── AI Search ─────────────────────────────────────────────────────────────
  aiSearchMode = false;
  aiSearchLoading = false;
  aiResults: AiSearchResult[] = [];
  aiSearchPrompt = '';

  // Login prompt modal (for unauthenticated users)
  showLoginPrompt = false;

  // Modal detail
  selectedMission: Mission | null = null;
  modalClosing = false;

  // Card menu
  openMenuId: string | null = null;

  // Track which missions the freelancer has already applied to, with their status
  applicationStatusMap = new Map<string, 'PENDING' | 'ACCEPTED' | 'REJECTED'>();
  cancellingMissionIds = new Set<string>();

  private profileCompletion: number | null = null;

  constructor(
    private missionService: MissionService,
    public authService: AuthService,
    private freelancerService: FreelancerService,
    private applicationService: ApplicationService,
    private toastService: ToastService,
    private router: Router,
    private route: ActivatedRoute,
  ) {}

  @HostListener('document:click')
  onDocumentClick(): void {
    this.openMenuId = null;
  }

  similarMissions: Mission[] = [];

  openDetail(mission: Mission): void {
    if (!this.authService.isAuthenticated()) {
      this.showLoginPrompt = true;
      return;
    }
    this.selectedMission = mission;
    this.modalClosing = false;
    this.similarMissions = this.computeSimilarMissions(mission);
    document.body.style.overflow = 'hidden';
  }

  switchToMission(mission: Mission): void {
    this.selectedMission = mission;
    this.similarMissions = this.computeSimilarMissions(mission);
    const body = document.querySelector('.modal-body');
    if (body) body.scrollTop = 0;
  }

  private computeSimilarMissions(mission: Mission): Mission[] {
    const field = mission.field?.toLowerCase() || '';
    const sector = mission.missionBusinessSector?.toLowerCase() || '';
    const speciality = mission.speciality?.toLowerCase() || '';
    const skills = (mission.requiredSkills?.replace(/<[^>]*>/g, '') || '').toLowerCase();
    const title = mission.jobTitle?.toLowerCase() || '';

    const scored = this.missions
      .filter(m => m.id !== mission.id && !this.isExpiredOver1h(m))
      .map(m => {
        let score = 0;
        const mField = m.field?.toLowerCase() || '';
        const mSector = m.missionBusinessSector?.toLowerCase() || '';
        const mSpec = m.speciality?.toLowerCase() || '';
        const mSkills = (m.requiredSkills?.replace(/<[^>]*>/g, '') || '').toLowerCase();
        const mTitle = m.jobTitle?.toLowerCase() || '';

        // Field match (strong signal)
        if (field && mField && (mField.includes(field) || field.includes(mField))) score += 3;

        // Sector overlap
        if (sector && mSector) {
          const sectorWords = sector.split(/[,;]+/).map(s => s.trim()).filter(s => s);
          const mSectorWords = mSector.split(/[,;]+/).map(s => s.trim()).filter(s => s);
          for (const sw of sectorWords) {
            if (mSectorWords.some(ms => ms.includes(sw) || sw.includes(ms))) { score += 2; break; }
          }
        }

        // Speciality overlap
        if (speciality && mSpec) {
          const specWords = speciality.split(/[,;]+/).map(s => s.trim()).filter(s => s);
          const mSpecWords = mSpec.split(/[,;]+/).map(s => s.trim()).filter(s => s);
          for (const sp of specWords) {
            if (mSpecWords.some(ms => ms.includes(sp) || sp.includes(ms))) { score += 2; break; }
          }
        }

        // Skills keyword overlap
        if (skills && mSkills) {
          const skillTokens = skills.split(/[,;]+/).map(s => s.trim()).filter(s => s.length > 2);
          for (const sk of skillTokens) {
            if (mSkills.includes(sk)) { score += 1; }
          }
        }

        // Title similarity
        if (title && mTitle) {
          const titleWords = title.split(/\s+/).filter(w => w.length > 3);
          for (const tw of titleWords) {
            if (mTitle.includes(tw)) { score += 1; }
          }
        }

        return { mission: m, score };
      })
      .filter(s => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);

    return scored.map(s => s.mission);
  }

  closeDetail(): void {
    this.modalClosing = true;
    setTimeout(() => {
      this.selectedMission = null;
      this.modalClosing = false;
      document.body.style.overflow = '';
    }, 300);
  }

  onOverlayClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('modal-overlay')) {
      this.closeDetail();
    }
  }

  getAllSkillsList(skills: string): string[] {
    const plain = skills.replace(/<[^>]*>/g, '');
    return plain.split(/[,;]+/).map(s => s.trim()).filter(s => s.length > 0);
  }

  getTruncatedDescription(text: string | undefined, maxLength = 200): string {
    if (!text) return '';
    const plain = text.replace(/<[^>]*>/g, '');
    if (plain.length <= maxLength) return plain;
    return plain.substring(0, maxLength) + '...';
  }

  // Visible items (for "See more" toggle)
  get visibleCategories() {
    return this.showAllCategories ? this.categories : this.categories.slice(0, 6);
  }

  get visibleSectors() {
    return this.showAllSectors ? this.sectors : this.sectors.slice(0, 6);
  }

  get visibleSpecialities() {
    return this.showAllSpecialities ? this.specialities : this.specialities.slice(0, 6);
  }

  // Count matching missions per filter option
  getCategoryCount(value: string): number {
    const v = value.toLowerCase();
    return this.missions.filter(m =>
      m.field?.toLowerCase().includes(v) ||
      m.jobTitle?.toLowerCase().includes(v) ||
      m.requiredSkills?.toLowerCase().includes(v)
    ).length;
  }

  getSectorCount(value: string): number {
    const v = value.toLowerCase();
    return this.missions.filter(m =>
      m.businessSector?.toLowerCase().includes(v) ||
      m.missionBusinessSector?.toLowerCase().includes(v)
    ).length;
  }

  // Active filter chips
  get activeFilters(): { type: string; label: string; key: string }[] {
    const chips: { type: string; label: string; key: string }[] = [];

    this.employmentTypes.filter(t => t.checked).forEach(t =>
      chips.push({ type: 'Employment', label: t.label, key: `employment:${t.value}` })
    );
    this.categories.filter(c => c.checked).forEach(c =>
      chips.push({ type: 'Category', label: c.label, key: `category:${c.value}` })
    );
    this.sectors.filter(s => s.checked).forEach(s =>
      chips.push({ type: 'Sector', label: s.label, key: `sector:${s.value}` })
    );
    this.specialities.filter(s => s.checked).forEach(s =>
      chips.push({ type: 'Skill', label: s.label, key: `speciality:${s.value}` })
    );
    this.experienceLevels.filter(l => l.checked).forEach(l =>
      chips.push({ type: 'Experience', label: l.label, key: `experience:${l.label}` })
    );

    return chips;
  }

  removeFilter(key: string): void {
    const [type, value] = key.split(':');
    switch (type) {
      case 'employment': {
        const item = this.employmentTypes.find(t => t.value === value);
        if (item) item.checked = false;
        break;
      }
      case 'category': {
        const item = this.categories.find(c => c.value === value);
        if (item) item.checked = false;
        break;
      }
      case 'sector': {
        const item = this.sectors.find(s => s.value === value);
        if (item) item.checked = false;
        break;
      }
      case 'speciality': {
        const item = this.specialities.find(s => s.value === value);
        if (item) item.checked = false;
        break;
      }
      case 'experience': {
        const item = this.experienceLevels.find(l => l.label === value);
        if (item) item.checked = false;
        break;
      }
    }
    this.applyFilters();
  }

  get isFreelancer(): boolean {
    return this.authService.currentUser()?.role === 'FREELANCER';
  }

  get isCompany(): boolean {
    return this.authService.currentUser()?.role === 'COMPANY';
  }

  isOwner(mission: Mission): boolean {
    const user = this.authService.currentUser();
    return !!user && user.role === 'COMPANY' && user.id === mission.companyId;
  }

  toggleCardMenu(event: Event, missionId: string): void {
    event.stopPropagation();
    this.openMenuId = this.openMenuId === missionId ? null : missionId;
  }

  editMission(event: Event, mission: Mission): void {
    event.stopPropagation();
    this.openMenuId = null;
    this.router.navigate(['/edit-mission', mission.id]);
  }

  deleteMission(event: Event, mission: Mission): void {
    event.stopPropagation();
    this.openMenuId = null;
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette mission ?')) return;
    this.missionService.deleteMission(mission.id!).subscribe({
      next: () => {
        this.missions = this.missions.filter(m => m.id !== mission.id);
        this.applyFilters();
      },
      error: (err) => {
        alert(err.error?.message || 'Erreur lors de la suppression.');
      },
    });
  }

  ngOnInit(): void {
    // Read search query from home page search bar
    const q = this.route.snapshot.queryParamMap.get('q');
    if (q) this.searchQuery = q;

    // Détecter si on vient de la home en mode AI
    const aiMode = this.route.snapshot.queryParamMap.get('ai');
    const prompt = this.route.snapshot.queryParamMap.get('prompt');
    if (aiMode === 'true' && prompt) {
      this.aiSearchMode = true;
      this.aiSearchPrompt = prompt;
    }

    this.loadMissions();
    if (this.isFreelancer) {
      this.freelancerService.getMyProfile().subscribe({
        next: (f) => this.profileCompletion = getProfileCompletion(f),
      });
      this.loadMyApplications();
    }
  }

  loadMyApplications(): void {
    this.applicationService.getMyApplications().subscribe({
      next: (applications) => {
        this.applicationStatusMap.clear();
        for (const app of applications) {
          if (app.status !== 'WITHDRAWN') {
            this.applicationStatusMap.set(app.missionId, app.status as 'PENDING' | 'ACCEPTED' | 'REJECTED');
          }
        }
      },
    });
  }

  hasApplied(mission: Mission): boolean {
    return this.applicationStatusMap.has(mission.id!);
  }

  getApplicationStatus(mission: Mission): 'PENDING' | 'ACCEPTED' | 'REJECTED' | null {
    return this.applicationStatusMap.get(mission.id!) ?? null;
  }

  cancelApplication(event: Event, mission: Mission): void {
    event.stopPropagation();
    if (this.cancellingMissionIds.has(mission.id!)) return;

    this.cancellingMissionIds.add(mission.id!);
    this.applicationService.withdrawApplication(mission.id!).subscribe({
      next: () => {
        this.applicationStatusMap.delete(mission.id!);
        this.cancellingMissionIds.delete(mission.id!);
        this.toastService.show('Your application has been cancelled.', 'success');
      },
      error: (err) => {
        this.cancellingMissionIds.delete(mission.id!);
        const message = err.error?.message || err.error?.error || 'Failed to cancel application.';
        this.toastService.show(message, 'error');
      },
    });
  }

  loadMissions(): void {
    this.loading = true;
    this.missionService.getAllMissions().subscribe({
      next: (missions) => {
        this.missions = missions.sort((a, b) => {
          const da = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const db = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return db - da;
        });
        this.loading = false;
        this.computeTjmBounds();
        this.buildHistogram();
        this.applyFilters();

        // Si on vient de la home avec mode AI, déclencher la recherche
        if (this.aiSearchMode && this.aiSearchPrompt) {
          this.triggerAiSearch();
        }
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  onSearch(): void {
    this.applyFilters();
  }

  // ── AI Search ─────────────────────────────────────────────────────────────

  // Map missionId → score pour afficher le badge sur chaque carte
  aiScoreMap = new Map<string, number>();

  toggleAiMode(): void {
    this.aiSearchMode = !this.aiSearchMode;
    if (!this.aiSearchMode) {
      // Retour mode normal : réafficher toutes les missions
      this.aiResults = [];
      this.aiSearchPrompt = '';
      this.aiScoreMap.clear();
      this.applyFilters();
    }
  }

  triggerAiSearch(): void {
    const prompt = this.aiSearchPrompt.trim();
    if (!prompt) return;

    this.aiSearchLoading = true;
    this.aiResults = [];
    this.aiScoreMap.clear();

    this.missionService.aiSearch(prompt, 10).subscribe({
      next: (results) => {
        this.aiResults = results;
        this.aiSearchLoading = false;

        // Construire la map id → score
        results.forEach(r => this.aiScoreMap.set(r.mission.id!, r.score));

        // Remplacer filteredMissions par les résultats AI dans le bon ordre
        this.filteredMissions = results.map(r => r.mission);
      },
      error: () => {
        this.aiSearchLoading = false;
        this.filteredMissions = [];
      },
    });
  }

  onAiSearchKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      this.triggerAiSearch();
    }
  }

  getScoreColor(score: number): string {
    if (score >= 75) return '#22c55e';  // vert
    if (score >= 50) return '#f59e0b';  // orange
    return '#94a3b8';                   // gris
  }

  getAiScore(missionId: string): number | null {
    return this.aiScoreMap.get(missionId) ?? null;
  }

  applyFilters(): void {
    // Hide missions whose deadline passed more than 1 hour ago
    let result = this.missions.filter(m => !this.isExpiredOver1h(m));

    // Search by keyword
    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase();
      result = result.filter(m =>
        m.jobTitle?.toLowerCase().includes(q) ||
        m.description?.toLowerCase().includes(q) ||
        m.requiredSkills?.toLowerCase().includes(q) ||
        m.field?.toLowerCase().includes(q) ||
        m.companyName?.toLowerCase().includes(q)
      );
    }

    // Search by location
    if (this.locationQuery.trim()) {
      const loc = this.locationQuery.toLowerCase();
      result = result.filter(m => m.location?.toLowerCase().includes(loc));
    }

    // Filter by TJM range (dual)
    result = result.filter(m => !m.tjm || (m.tjm >= this.tjmRangeMin && m.tjm <= this.tjmRangeMax));

    // Filter by employment type
    const activeTypes = this.employmentTypes.filter(t => t.checked).map(t => t.value.toLowerCase());
    if (activeTypes.length > 0) {
      result = result.filter(m => m.missionType && activeTypes.some(t => m.missionType.toLowerCase().includes(t)));
    }

    // Filter by speciality
    const activeSpecs = this.specialities.filter(s => s.checked).map(s => s.value.toLowerCase());
    if (activeSpecs.length > 0) {
      result = result.filter(m =>
        activeSpecs.some(s =>
          m.speciality?.toLowerCase().includes(s) ||
          m.requiredSkills?.toLowerCase().includes(s) ||
          m.technicalEnvironment?.toLowerCase().includes(s) ||
          m.field?.toLowerCase().includes(s) ||
          m.jobTitle?.toLowerCase().includes(s)
        )
      );
    }

    // Filter by category
    const activeCats = this.categories.filter(c => c.checked).map(c => c.value.toLowerCase());
    if (activeCats.length > 0) {
      result = result.filter(m =>
        activeCats.some(c =>
          m.field?.toLowerCase().includes(c) ||
          m.jobTitle?.toLowerCase().includes(c) ||
          m.requiredSkills?.toLowerCase().includes(c)
        )
      );
    }

    // Filter by sector
    const activeSectors = this.sectors.filter(s => s.checked).map(s => s.value.toLowerCase());
    if (activeSectors.length > 0) {
      result = result.filter(m =>
        activeSectors.some(s =>
          m.businessSector?.toLowerCase().includes(s) ||
          m.missionBusinessSector?.toLowerCase().includes(s)
        )
      );
    }

    // Filter by experience level
    const activeLevels = this.experienceLevels.filter(l => l.checked);
    if (activeLevels.length > 0) {
      result = result.filter(m =>
        m.yearsOfExperience == null || activeLevels.some(l => m.yearsOfExperience! >= l.min && m.yearsOfExperience! <= l.max)
      );
    }

    this.filteredMissions = result;
  }

  resetFilters(): void {
    this.searchQuery = '';
    this.locationQuery = '';
    this.tjmRangeMin = this.tjmMin;
    this.tjmRangeMax = this.tjmMax;
    this.employmentTypes.forEach(t => t.checked = false);
    this.categories.forEach(c => c.checked = false);
    this.sectors.forEach(s => s.checked = false);
    this.specialities.forEach(s => s.checked = false);
    this.experienceLevels.forEach(l => l.checked = false);
    this.applyFilters();
  }

  computeTjmBounds(): void {
    try {
      const tjms = this.missions.map(m => m.tjm).filter((t): t is number => t != null && t > 0);
      if (tjms.length > 0) {
        this.tjmMin = Math.floor(Math.min(...tjms) / 10) * 10;
        this.tjmMax = Math.ceil(Math.max(...tjms) / 10) * 10;
        if (this.tjmMin === this.tjmMax) {
          this.tjmMin = Math.max(0, this.tjmMin - 100);
          this.tjmMax = this.tjmMax + 100;
        }
      } else {
        this.tjmMin = 0;
        this.tjmMax = 1000;
      }
      this.tjmRangeMin = this.tjmMin;
      this.tjmRangeMax = this.tjmMax;
    } catch {
      this.tjmMin = 0;
      this.tjmMax = 1000;
      this.tjmRangeMin = 0;
      this.tjmRangeMax = 1000;
    }
  }

  buildHistogram(): void {
    try {
      const tjms = this.missions.map(m => m.tjm).filter((t): t is number => t != null && t > 0);
      const buckets = new Array(this.bucketCount).fill(0);
      if (tjms.length === 0 || this.tjmMax <= this.tjmMin) {
        this.histogramBuckets = buckets;
        return;
      }
      const range = this.tjmMax - this.tjmMin;
      const bucketSize = range / this.bucketCount;
      for (const t of tjms) {
        let idx = Math.floor((t - this.tjmMin) / bucketSize);
        if (idx < 0) idx = 0;
        if (idx >= this.bucketCount) idx = this.bucketCount - 1;
        buckets[idx]++;
      }
      this.histogramBuckets = buckets;
    } catch {
      this.histogramBuckets = new Array(this.bucketCount).fill(0);
    }
  }

  getBucketHeight(count: number): number {
    const max = Math.max(...this.histogramBuckets, 1);
    return (count / max) * 100;
  }

  isBucketInRange(index: number): boolean {
    const range = this.tjmMax - this.tjmMin;
    const bucketSize = range / this.bucketCount;
    const bucketStart = this.tjmMin + index * bucketSize;
    const bucketEnd = bucketStart + bucketSize;
    return bucketEnd >= this.tjmRangeMin && bucketStart <= this.tjmRangeMax;
  }

  onRangeMinInput(event: Event): void {
    const val = +(event.target as HTMLInputElement).value;
    if (val <= this.tjmRangeMax) {
      this.tjmRangeMin = val;
    } else {
      this.tjmRangeMin = this.tjmRangeMax;
    }
    this.applyFilters();
  }

  onRangeMaxInput(event: Event): void {
    const val = +(event.target as HTMLInputElement).value;
    if (val >= this.tjmRangeMin) {
      this.tjmRangeMax = val;
    } else {
      this.tjmRangeMax = this.tjmRangeMin;
    }
    this.applyFilters();
  }

  private parseDeadline(deadline: any): Date | null {
    if (!deadline) return null;
    try {
      let d: Date;
      if (Array.isArray(deadline)) {
        const [y, m, day] = deadline;
        d = new Date(y, m - 1, day);
      } else {
        d = new Date(deadline);
      }
      return isNaN(d.getTime()) ? null : d;
    } catch {
      return null;
    }
  }

  isDeadlineUrgent(mission: any): boolean {
    const d = this.parseDeadline(mission.applicationDeadline);
    if (!d) return false;
    const diffHours = (d.getTime() - Date.now()) / (1000 * 60 * 60);
    return diffHours > 0 && diffHours <= 24;
  }

  isDeadlinePassed(mission: any): boolean {
    const d = this.parseDeadline(mission.applicationDeadline);
    if (!d) return false;
    return d.getTime() <= Date.now();
  }

  isExpiredOver1h(mission: any): boolean {
    const d = this.parseDeadline(mission.applicationDeadline);
    if (!d) return false;
    return (Date.now() - d.getTime()) > (1000 * 60 * 60);
  }

  getMissionStatus(mission: any): string {
    if (mission.status === 'CLOSED' || this.isDeadlinePassed(mission)) return 'CLOSED';
    return mission.status || 'OPEN';
  }

  formatCreatedAt(dateStr: string): string {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return '';
      return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
        + ' ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  }

  getTimeAgo(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 60) return `Il y a ${diffMins} min`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `Il y a ${diffHours}h`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 30) return `Il y a ${diffDays}j`;
    const diffMonths = Math.floor(diffDays / 30);
    return `Il y a ${diffMonths} mois`;
  }

  getSkillsList(skills: string): string[] {
    const plain = skills.replace(/<[^>]*>/g, '').replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&').replace(/&lt;/gi, '<').replace(/&gt;/gi, '>');
    return plain.split(/[,;]+/).map(s => s.trim()).filter(s => s.length > 0).slice(0, 6);
  }

  stripHtml(html: string): string {
    if (!html) return '';
    return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
  }

  formatDate(date: string | any): string {
    try {
      if (!date) return '';
      // Handle Java LocalDate array format [2025, 6, 15]
      if (Array.isArray(date)) {
        const [y, m, d] = date;
        return `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`;
      }
      // Handle string format "2025-06-15"
      const d = new Date(date);
      if (isNaN(d.getTime())) return String(date);
      return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return String(date);
    }
  }

  getFileUrl(relativePath: string | undefined): string {
    if (!relativePath) return '';
    const baseUrl = environment.apiUrl.replace(/\/api$/, '');
    return baseUrl + relativePath;
  }

  applyToMission(event: Event, mission: Mission): void {
    event.stopPropagation();
    if (!this.authService.isAuthenticated()) {
      this.showLoginPrompt = true;
      return;
    }
    if (this.profileCompletion !== null && this.profileCompletion < 80) {
      this.toastService.show(
        `Your profile is ${this.profileCompletion}% complete. Please complete at least 80% of your profile before applying.`,
        'warning'
      );
      return;
    }
    this.router.navigate(['/apply', mission.id]);
  }
}
