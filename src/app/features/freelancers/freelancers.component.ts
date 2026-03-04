import { Component, OnInit, signal, computed, HostListener, effect, DestroyRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router, ActivatedRoute } from '@angular/router';
import { toObservable } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged, map } from 'rxjs';
import { FreelancerService } from '../../core/services/freelancer.service';
import { AuthService } from '../../core/services/auth.service';
import { Freelancer } from '../../core/models';
import { environment } from '../../../environments/environment';

type FilterDropdown = 'profileType' | 'skills' | 'budget' | 'experience' | 'language' | null;
type SortOption = 'rating' | 'tjm_asc' | 'tjm_desc' | 'experience' | 'projects';

const PROFILE_TYPE_LABELS: Record<string, string> = {
  BI_DATA: 'BI & Data',
  BUSINESS_CONSULTING: 'Business Consulting',
  ERP_CRM: 'ERP / CRM',
  INDUSTRIAL_IT_ELECTRONICS: 'Industrial IT',
  NEW_TECHNOLOGIES: 'New Technologies',
  OFFICE_SUPPORT: 'Office & Support',
  TESTING_QUALITY: 'Testing & Quality',
  SYSTEM_RESOURCES: 'System Resources',
  STUDIES_DEVELOPMENT: 'Studies & Dev',
  SYSTEMS_INFRASTRUCTURE: 'Systems & Infra',
  OTHER: 'Other',
};

const LANGUAGE_LABELS: Record<string, string> = {
  FRENCH: 'French',
  ENGLISH: 'English',
  ARABIC: 'Arabic',
  SPANISH: 'Spanish',
  GERMAN: 'German',
  ITALIAN: 'Italian',
  PORTUGUESE: 'Portuguese',
  CHINESE: 'Chinese',
  JAPANESE: 'Japanese',
  OTHER: 'Other',
};

const EXPERIENCE_RANGES = [
  { label: '0 - 2 years', min: 0, max: 2 },
  { label: '3 - 5 years', min: 3, max: 5 },
  { label: '6 - 10 years', min: 6, max: 10 },
  { label: '10+ years', min: 10, max: 99 },
];

@Component({
  selector: 'app-freelancers',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './freelancers.component.html',
  styleUrl: './freelancers.component.css',
})
export class FreelancersComponent implements OnInit {
  freelancers = signal<Freelancer[]>([]);
  loading = signal(true);
  searchQuery = signal('');

  // Filter states
  selectedProfileTypes = signal<Set<string>>(new Set());
  selectedSkills = signal<Set<string>>(new Set());
  selectedLanguages = signal<Set<string>>(new Set());
  budgetMin = signal<number | null>(null);
  budgetMax = signal<number | null>(null);
  selectedExperience = signal<number | null>(null); // index in EXPERIENCE_RANGES
  sortBy = signal<SortOption>('rating');
  showSortDropdown = signal(false);

  // Dropdown open state
  openDropdown = signal<FilterDropdown>(null);

  showLoginPrompt = false;

  // Carousel
  cardImageIndex = signal<Record<string, number>>({});
  private imageCache = new Map<string, string[]>();

  // Constants for template
  readonly profileTypeKeys = Object.keys(PROFILE_TYPE_LABELS);
  readonly profileTypeLabels = PROFILE_TYPE_LABELS;
  readonly languageKeys = Object.keys(LANGUAGE_LABELS);
  readonly languageLabels = LANGUAGE_LABELS;
  readonly experienceRanges = EXPERIENCE_RANGES;
  readonly sortOptions: { value: SortOption; label: string }[] = [
    { value: 'rating',     label: 'Best Rated' },
    { value: 'tjm_desc',   label: 'Rate: Highest' },
    { value: 'tjm_asc',    label: 'Rate: Lowest' },
    { value: 'experience', label: 'Most Experienced' },
    { value: 'projects',   label: 'Most Projects' },
  ];

  readonly quickTags = ['React', 'Python', 'UI/UX', 'Node.js', 'Flutter', 'DevOps'];

  allSkills = computed(() => {
    const skills = new Set<string>();
    for (const f of this.freelancers()) {
      for (const s of f.skills || []) {
        skills.add(s);
      }
    }
    return Array.from(skills).sort();
  });

  activeFilterCount = computed(() => {
    let count = 0;
    if (this.selectedProfileTypes().size > 0) count++;
    if (this.selectedSkills().size > 0) count++;
    if (this.selectedLanguages().size > 0) count++;
    if (this.budgetMin() !== null || this.budgetMax() !== null) count++;
    if (this.selectedExperience() !== null) count++;
    if (this.searchQuery()) count++;
    return count;
  });

  filteredFreelancers = computed(() => {
    let list = this.freelancers();
    const query = this.searchQuery().toLowerCase().trim();
    const profileTypes = this.selectedProfileTypes();
    const skills = this.selectedSkills();
    const languages = this.selectedLanguages();
    const bMin = this.budgetMin();
    const bMax = this.budgetMax();
    const expIdx = this.selectedExperience();
    const sort = this.sortBy();

    // Search
    if (query) {
      list = list.filter(
        (f) =>
          (f.firstName + ' ' + f.lastName).toLowerCase().includes(query) ||
          (f.currentPosition || '').toLowerCase().includes(query) ||
          (f.skills || []).some((s) => s.toLowerCase().includes(query)),
      );
    }

    // Profile type
    if (profileTypes.size > 0) {
      list = list.filter((f) =>
        (f.profileTypes || []).some((pt) => profileTypes.has(pt)),
      );
    }

    // Skills
    if (skills.size > 0) {
      list = list.filter((f) =>
        (f.skills || []).some((s) => skills.has(s)),
      );
    }

    // Languages
    if (languages.size > 0) {
      list = list.filter((f) =>
        (f.languages || []).some((l) => languages.has(l)),
      );
    }

    // Budget (TJM)
    if (bMin !== null) {
      list = list.filter((f) => f.tjm != null && f.tjm >= bMin);
    }
    if (bMax !== null) {
      list = list.filter((f) => f.tjm != null && f.tjm <= bMax);
    }

    // Experience
    if (expIdx !== null) {
      const range = EXPERIENCE_RANGES[expIdx];
      list = list.filter(
        (f) =>
          f.yearsOfExperience != null &&
          f.yearsOfExperience >= range.min &&
          f.yearsOfExperience <= range.max,
      );
    }

    // Sort
    list = [...list].sort((a, b) => {
      switch (sort) {
        case 'rating':
          return (b.rating || 0) - (a.rating || 0);
        case 'tjm_asc':
          return (a.tjm || 0) - (b.tjm || 0);
        case 'tjm_desc':
          return (b.tjm || 0) - (a.tjm || 0);
        case 'experience':
          return (b.yearsOfExperience || 0) - (a.yearsOfExperience || 0);
        case 'projects':
          return (b.completedProjects || 0) - (a.completedProjects || 0);
        default:
          return 0;
      }
    });

    return list;
  });

  constructor(
    private freelancerService: FreelancerService,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
  ) {
    const destroyRef = inject(DestroyRef);

    const sub = toObservable(this.filteredFreelancers).pipe(
      map(list => list.map(f => f.id)),
      debounceTime(1500),
      distinctUntilChanged((a, b) => a.join(',') === b.join(',')),
    ).subscribe(ids => {
      if (ids.length > 0 && this.activeFilterCount() > 0 && this.authService.isAuthenticated()) {
        this.freelancerService.recordSearchAppearances(ids).subscribe();
      }
    });

    destroyRef.onDestroy(() => sub.unsubscribe());
  }

  viewProfile(id: string): void {
    if (!this.authService.isAuthenticated()) {
      this.showLoginPrompt = true;
      return;
    }
    this.router.navigate(['/profile', id]);
  }

  ngOnInit(): void {
    const params = this.route.snapshot.queryParamMap;
    const q = params.get('q') || '';
    const skill = params.get('skill') || '';
    if (q) this.searchQuery.set(q);
    if (skill) this.searchQuery.set(skill);
    if (q && skill) this.searchQuery.set(`${q} ${skill}`.trim());

    this.freelancerService.getAllFreelancers().subscribe({
      next: (data) => {
        this.freelancers.set(data);
        this.buildImageCache(data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  // ─── Dropdown logic ───
  toggleDropdown(name: FilterDropdown, event: Event): void {
    event.stopPropagation();
    this.showSortDropdown.set(false);
    this.openDropdown.set(this.openDropdown() === name ? null : name);
  }

  toggleSortDropdown(event: Event): void {
    event.stopPropagation();
    this.openDropdown.set(null);
    this.showSortDropdown.set(!this.showSortDropdown());
  }

  @HostListener('document:click')
  closeAllDropdowns(): void {
    this.openDropdown.set(null);
    this.showSortDropdown.set(false);
  }

  stopPropagation(event: Event): void {
    event.stopPropagation();
  }

  // ─── Filter toggle helpers ───
  toggleProfileType(value: string): void {
    const current = new Set(this.selectedProfileTypes());
    current.has(value) ? current.delete(value) : current.add(value);
    this.selectedProfileTypes.set(current);
  }

  toggleSkill(value: string): void {
    const current = new Set(this.selectedSkills());
    current.has(value) ? current.delete(value) : current.add(value);
    this.selectedSkills.set(current);
  }

  toggleLanguage(value: string): void {
    const current = new Set(this.selectedLanguages());
    current.has(value) ? current.delete(value) : current.add(value);
    this.selectedLanguages.set(current);
  }

  selectExperience(index: number): void {
    this.selectedExperience.set(this.selectedExperience() === index ? null : index);
  }

  onBudgetMinChange(val: string): void {
    this.budgetMin.set(val ? Number(val) : null);
  }

  onBudgetMaxChange(val: string): void {
    this.budgetMax.set(val ? Number(val) : null);
  }

  selectSort(option: SortOption): void {
    this.sortBy.set(option);
    this.showSortDropdown.set(false);
  }

  get currentSortLabel(): string {
    return this.sortOptions.find((o) => o.value === this.sortBy())?.label || '';
  }

  // ─── Filter dropdown labels with count ───
  profileTypeLabel(): string {
    const count = this.selectedProfileTypes().size;
    return count > 0 ? `Profile Type (${count})` : 'Profile Type';
  }

  skillsLabel(): string {
    const count = this.selectedSkills().size;
    return count > 0 ? `Skills (${count})` : 'Skills';
  }

  languageLabel(): string {
    const count = this.selectedLanguages().size;
    return count > 0 ? `Language (${count})` : 'Language';
  }

  budgetLabel(): string {
    const min = this.budgetMin();
    const max = this.budgetMax();
    if (min !== null && max !== null) return `Rate: ${min} – ${max} DT`;
    if (min !== null) return `Rate: ${min}+ DT`;
    if (max !== null) return `Rate: ≤${max} DT`;
    return 'Daily Rate';
  }

  experienceLabel(): string {
    const idx = this.selectedExperience();
    if (idx !== null) return `Experience: ${EXPERIENCE_RANGES[idx].label}`;
    return 'Experience';
  }

  clearAllFilters(): void {
    this.searchQuery.set('');
    this.selectedProfileTypes.set(new Set());
    this.selectedSkills.set(new Set());
    this.selectedLanguages.set(new Set());
    this.budgetMin.set(null);
    this.budgetMax.set(null);
    this.selectedExperience.set(null);
    this.sortBy.set('rating');
  }

  onSearchChange(value: string): void {
    this.searchQuery.set(value);
  }

  // ─── Image carousel ───
  private buildImageCache(freelancers: Freelancer[]): void {
    this.imageCache.clear();
    for (const f of freelancers) {
      const images: string[] = [];
      if (f.portfolioImages?.length) {
        for (const img of f.portfolioImages) {
          images.push(this.getFileUrl(img));
        }
      }
      if (f.cardBackground) {
        images.push(this.getFileUrl(f.cardBackground));
      }
      this.imageCache.set(f.id, images);
    }
  }

  getFileUrl(path: string | undefined): string {
    if (!path) return '';
    const baseUrl = environment.apiUrl.replace(/\/api$/, '');
    return baseUrl + path;
  }

  getCardImages(f: Freelancer): string[] {
    return this.imageCache.get(f.id) || [];
  }

  getCurrentImageIndex(f: Freelancer): number {
    return this.cardImageIndex()[f.id] || 0;
  }

  prevImage(f: Freelancer, event: Event): void {
    event.stopPropagation();
    const images = this.getCardImages(f);
    if (images.length <= 1) return;
    const current = this.getCurrentImageIndex(f);
    const newIndex = current === 0 ? images.length - 1 : current - 1;
    this.cardImageIndex.set({ ...this.cardImageIndex(), [f.id]: newIndex });
  }

  nextImage(f: Freelancer, event: Event): void {
    event.stopPropagation();
    const images = this.getCardImages(f);
    if (images.length <= 1) return;
    const current = this.getCurrentImageIndex(f);
    const newIndex = current === images.length - 1 ? 0 : current + 1;
    this.cardImageIndex.set({ ...this.cardImageIndex(), [f.id]: newIndex });
  }

  goToImage(f: Freelancer, index: number, event: Event): void {
    event.stopPropagation();
    this.cardImageIndex.set({ ...this.cardImageIndex(), [f.id]: index });
  }

  getInitials(f: Freelancer): string {
    return ((f.firstName?.charAt(0) || '') + (f.lastName?.charAt(0) || '')).toUpperCase();
  }
}
