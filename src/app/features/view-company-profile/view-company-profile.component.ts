import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { CompanyService } from '../../core/services/company.service';
import { AuthService } from '../../core/services/auth.service';
import { MissionService } from '../../core/services/mission.service';
import { Company } from '../../core/models';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-view-company-profile',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './view-company-profile.component.html',
  styleUrl: './view-company-profile.component.css',
})
export class ViewCompanyProfileComponent implements OnInit {
  company = signal<Company | null>(null);
  loading = signal(true);
  error = signal('');
  isOwnProfile = signal(false);
  missionCount = signal(0);

  constructor(
    private route: ActivatedRoute,
    private companyService: CompanyService,
    private authService: AuthService,
    private missionService: MissionService,
    private translate: TranslateService,
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');

    if (id) {
      this.loadCompany(id);
    } else {
      this.loadOwnProfile();
    }
  }

  private loadCompany(id: string): void {
    this.companyService.getCompanyById(id).subscribe({
      next: (company) => {
        this.company.set(company);
        this.checkIfOwnProfile(company);
        this.loading.set(false);
        this.loadMissionCount(company.id);
      },
      error: () => {
        this.error.set(this.translate.instant('view_company.not_found'));
        this.loading.set(false);
      },
    });
  }

  private loadOwnProfile(): void {
    this.companyService.getMyProfile().subscribe({
      next: (company) => {
        this.company.set(company);
        this.isOwnProfile.set(true);
        this.loading.set(false);
        this.loadMissionCount(company.id);
      },
      error: () => {
        this.error.set(this.translate.instant('view_company.load_error'));
        this.loading.set(false);
      },
    });
  }

  private loadMissionCount(companyId: string): void {
    if (!companyId) return;
    this.missionService.getMissionCountByCompany(companyId).subscribe({
      next: (res) => this.missionCount.set(res.count),
      error: () => this.missionCount.set(0),
    });
  }

  private checkIfOwnProfile(company: Company): void {
    const currentUser = this.authService.currentUser();
    if (currentUser && currentUser.email === company.email) {
      this.isOwnProfile.set(true);
    }
  }

  get initials(): string {
    const c = this.company();
    if (!c || !c.companyName) return '?';
    return c.companyName.charAt(0).toUpperCase();
  }

  getFileUrl(relativePath: string | undefined): string {
    if (!relativePath) return '';
    const baseUrl = environment.apiUrl.replace(/\/api$/, '');
    return baseUrl + relativePath;
  }

  formatEnumLabel(value: string): string {
    return value
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }

  formatDate(date: string | undefined): string {
    if (!date) return '';
    const locale = this.translate.currentLang === 'fr' ? 'fr-FR' : 'en-US';
    return new Date(date).toLocaleDateString(locale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }
}
