import { Component, OnInit, signal, computed, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { CommonModule, DatePipe, TitleCasePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AdminService } from '../../../core/services/admin.service';
import { Company } from '../../../core/models/user.model';
import { HttpClient } from '@angular/common/http';

interface TrustAnalysis {
  company_id: string;
  trust_score: number;
  label: string;
  details: {
    node1_website: {
      website_exists: boolean;
      ssl_valid: boolean;
      domain_age_years: number | null;
      social_media: Record<string, string | null>;
      social_links_found: string[];
      score: number;
      details: string[];
    };
    node2_email: {
      email_valid_format: boolean;
      has_mx_records: boolean;
      is_professional: boolean;
      matches_website: boolean;
      matches_company_name: boolean;
      email_domain: string;
      score: number;
      details: string[];
    };
    node3_scoring: {
      final_score: number;
      ai_score: number | null;
      rule_score: number;
      reasoning: string;
      method: string;
    };
  };
}

interface Signal {
  text: string;
  type: 'good' | 'bad' | 'warning';
  icon: 'check' | 'x' | 'warn';
}

import { Subscription } from 'rxjs';

@Component({
  selector: 'app-admin-company-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe, TitleCasePipe, RouterModule, TranslateModule],
  templateUrl: './admin-company-detail.component.html',
  styleUrls: ['./admin-company-detail.component.css'],
})
export class AdminCompanyDetailComponent implements OnInit, OnDestroy{
  company = signal<Company | null>(null);
  trustAnalysis = signal<TrustAnalysis | null>(null);
  loadingCompany = signal(true);
  loadingAI = signal(false);
  aiError = signal(false);
  actionLoading = signal(false);
  showRejectModal = signal(false);
  rejectReason = signal('');
  toastMessage = signal<{ text: string; type: 'success' | 'error' } | null>(null);

  private langSub?: Subscription;

    constructor(
  private route: ActivatedRoute,
    private router: Router,
    private adminService: AdminService,
    private http: HttpClient,
    private translate: TranslateService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.langSub = this.translate.onLangChange.subscribe(() => this.cdr.markForCheck());
    const id = this.route.snapshot.paramMap.get('id')!;
    this.adminService.getCompanyById(id).subscribe({
      next: (c) => {
        this.company.set(c);
        this.loadingCompany.set(false);
        this.runAIAnalysis(c);
      },
      error: () => this.loadingCompany.set(false),
    });
  }

  runAIAnalysis(c: Company) {
    this.loadingAI.set(true);
    this.aiError.set(false);
    this.http.post<TrustAnalysis>('http://localhost:8000/company/trust-score', {
      company_id: c.id,
      company_name: c.companyName,
      email: c.email,
      website_url: c.websiteUrl ?? null,
      business_sector: c.businessSector ?? null,
      trade_register: c.tradeRegister ?? null,
      description: c.description ?? null,
      number_of_employees: c.numberOfEmployees ?? null,
      foundation_date: c.foundationDate ?? null,
      address: c.address ?? null,
      manager_email: c.managerEmail ?? null,
    }).subscribe({
      next: (res) => { this.trustAnalysis.set(res); this.loadingAI.set(false); },
      error: () => { this.aiError.set(true); this.loadingAI.set(false); },
    });
  }

  rerunAnalysis() {
    const c = this.company();
    if (c) this.runAIAnalysis(c);
  }

  getSignals(): Signal[] {
    const ta = this.trustAnalysis();
    if (!ta) return [];
    const n1 = ta.details.node1_website;
    const n2 = ta.details.node2_email;
    const t = (k: string, p?: object) => this.translate.instant('admin_company_detail.' + k, p);
    const signals: Signal[] = [];

    if (n1.website_exists) signals.push({ text: t('sig_website_online'), type: 'good', icon: 'check' });
    else signals.push({ text: t('sig_no_website'), type: 'bad', icon: 'x' });

    if (n1.ssl_valid) signals.push({ text: t('sig_ssl_valid'), type: 'good', icon: 'check' });
    else if (n1.website_exists) signals.push({ text: t('sig_no_ssl'), type: 'bad', icon: 'x' });

    if (n1.domain_age_years !== null) {
      if (n1.domain_age_years >= 3) signals.push({ text: t('sig_domain_old', { years: n1.domain_age_years }), type: 'good', icon: 'check' });
      else if (n1.domain_age_years >= 1) signals.push({ text: t('sig_domain_recent', { years: n1.domain_age_years }), type: 'warning', icon: 'warn' });
      else signals.push({ text: t('sig_domain_new'), type: 'bad', icon: 'x' });
    }

    if (n1.social_links_found.length >= 2) signals.push({ text: t('sig_social_many', { count: n1.social_links_found.length, platforms: n1.social_links_found.join(', ') }), type: 'good', icon: 'check' });
    else if (n1.social_links_found.length === 1) signals.push({ text: t('sig_social_one', { platform: n1.social_links_found[0] }), type: 'warning', icon: 'warn' });
    else signals.push({ text: t('sig_no_social'), type: 'bad', icon: 'x' });

    if (n2.email_valid_format) signals.push({ text: t('sig_email_valid'), type: 'good', icon: 'check' });
    else signals.push({ text: t('sig_email_invalid'), type: 'bad', icon: 'x' });

    if (n2.has_mx_records) signals.push({ text: t('sig_mx_found'), type: 'good', icon: 'check' });
    else signals.push({ text: t('sig_no_mx'), type: 'bad', icon: 'x' });

    if (n2.is_professional) signals.push({ text: t('sig_professional_email'), type: 'good', icon: 'check' });
    else signals.push({ text: t('sig_generic_email'), type: 'bad', icon: 'x' });

    if (n2.matches_website) signals.push({ text: t('sig_email_matches_web'), type: 'good', icon: 'check' });
    else if (n2.is_professional) signals.push({ text: t('sig_email_no_match'), type: 'warning', icon: 'warn' });

    if (n2.matches_company_name) signals.push({ text: t('sig_email_matches_name'), type: 'good', icon: 'check' });

    return signals;
  }

  getGoodSignals(): Signal[] { return this.getSignals().filter(s => s.type === 'good'); }
  getBadSignals(): Signal[] { return this.getSignals().filter(s => s.type !== 'good'); }

  getSocialLinks(): { platform: string; url: string }[] {
    const ta = this.trustAnalysis();
    if (!ta) return [];
    const social = ta.details.node1_website.social_media;
    return Object.entries(social)
      .filter(([, url]) => url !== null && url !== '')
      .map(([platform, url]) => ({ platform, url: url as string }));
  }

  getAdminTips(): string[] {
    const ta = this.trustAnalysis();
    const c = this.company();
    if (!ta || !c) return [];
    const t = (k: string, p?: object) => this.translate.instant('admin_company_detail.' + k, p);
    const tips: string[] = [];
    const n1 = ta.details.node1_website;
    const n2 = ta.details.node2_email;

    if (ta.trust_score >= 75) tips.push(t('tip_all_good'));
    else if (ta.trust_score >= 45) tips.push(t('tip_review'));
    else tips.push(t('tip_risk'));

    if (!n1.website_exists) tips.push(t('tip_no_website'));
    if (!n1.ssl_valid && n1.website_exists) tips.push(t('tip_no_ssl'));
    if (!n2.is_professional) tips.push(t('tip_generic_email'));
    if (!n2.has_mx_records) tips.push(t('tip_no_mx'));
    if (!n2.matches_website) tips.push(t('tip_email_domain_mismatch'));
    if (n1.social_links_found.length === 0) tips.push(t('tip_no_social'));
    if (n1.domain_age_years !== null && n1.domain_age_years < 1) tips.push(t('tip_domain_new'));
    if (!c.tradeRegister) tips.push(t('tip_no_register'));
    if (c.tradeRegister) tips.push(t('tip_verify_register', { register: c.tradeRegister }));

    return tips;
  }

  getTrustClass(): string {
    const ta = this.trustAnalysis();
    if (!ta) return '';
    if (ta.trust_score >= 75) return 'trusted';
    if (ta.trust_score >= 45) return 'review';
    return 'suspicious';
  }

  getGaugeOffset(): number {
    const ta = this.trustAnalysis();
    const score = ta?.trust_score ?? 0;
    const circumference = 2 * Math.PI * 54;
    return circumference - (score / 100) * circumference;
  }

  statusLabel(status: string | undefined | null): string {
    const s = status ?? 'PENDING';
    return this.translate.instant('admin_verif.status_' + s.toLowerCase());
  }

  methodLabel(method: string): string {
    const key = method === 'ai_blended' ? 'method_ai_blended' : 'method_rule';
    return this.translate.instant('admin_company_detail.' + key);
  }

  getPlatformIcon(platform: string): string {
    const icons: Record<string, string> = {
      linkedin: 'in', facebook: 'f', twitter: 'X',
      instagram: 'ig', youtube: '▶', github: 'gh',
    };
    return icons[platform.toLowerCase()] ?? platform[0].toUpperCase();
  }

  getPlatformColor(platform: string): string {
    const colors: Record<string, string> = {
      linkedin: '#0077b5', facebook: '#1877f2', twitter: '#000000',
      instagram: '#e1306c', youtube: '#ff0000', github: '#24292e',
    };
    return colors[platform.toLowerCase()] ?? '#6b7280';
  }

  approve() {
    const c = this.company();
    if (!c) return;
    this.actionLoading.set(true);
    this.adminService.approveCompany(c.id).subscribe({
      next: () => {
        this.showToast(this.translate.instant('admin_company_detail.toast_approved'), 'success');
        this.actionLoading.set(false);
        setTimeout(() => this.router.navigate(['/admin/verifications']), 1500);
      },
      error: () => {
        this.showToast(this.translate.instant('admin_company_detail.toast_approve_err'), 'error');
        this.actionLoading.set(false);
      },
    });
  }

  openRejectModal() {
    this.rejectReason.set('');
    this.showRejectModal.set(true);
  }

  confirmReject() {
    const c = this.company();
    if (!c) return;
    this.actionLoading.set(true);
    this.adminService.rejectCompany(c.id, this.rejectReason()).subscribe({
      next: () => {
        this.showToast(this.translate.instant('admin_company_detail.toast_rejected'), 'success');
        this.showRejectModal.set(false);
        this.actionLoading.set(false);
        setTimeout(() => this.router.navigate(['/admin/verifications']), 1500);
      },
      error: () => {
        this.showToast(this.translate.instant('admin_company_detail.toast_reject_err'), 'error');
        this.actionLoading.set(false);
      },
    });
  }

  goBack() { this.router.navigate(['/admin/verifications']); }

  private showToast(text: string, type: 'success' | 'error') {
    this.toastMessage.set({ text, type });
    setTimeout(() => this.toastMessage.set(null), 3500);
  }

  ngOnDestroy(): void {
    this.langSub?.unsubscribe();
  }
}
