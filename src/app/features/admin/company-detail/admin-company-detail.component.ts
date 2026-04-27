import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule, DatePipe, TitleCasePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
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

@Component({
  selector: 'app-admin-company-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe, TitleCasePipe, RouterModule],
  templateUrl: './admin-company-detail.component.html',
  styleUrls: ['./admin-company-detail.component.css'],
})
export class AdminCompanyDetailComponent implements OnInit {
  company = signal<Company | null>(null);
  trustAnalysis = signal<TrustAnalysis | null>(null);
  loadingCompany = signal(true);
  loadingAI = signal(false);
  aiError = signal(false);
  actionLoading = signal(false);
  showRejectModal = signal(false);
  rejectReason = signal('');
  toastMessage = signal<{ text: string; type: 'success' | 'error' } | null>(null);

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private adminService: AdminService,
    private http: HttpClient
  ) {}

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.adminService.getCompanyById(id).subscribe({
      next: (c) => {
        this.company.set(c);
        this.loadingCompany.set(false);
        this.runAIAnalysis(c);
      },
      error: () => {
        this.loadingCompany.set(false);
      },
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
      next: (res) => {
        this.trustAnalysis.set(res);
        this.loadingAI.set(false);
      },
      error: () => {
        this.aiError.set(true);
        this.loadingAI.set(false);
      },
    });
  }

  rerunAnalysis() {
    const c = this.company();
    if (c) this.runAIAnalysis(c);
  }

  // ── Signals breakdown ────────────────────────────────────────────────────────
  getSignals(): Signal[] {
    const ta = this.trustAnalysis();
    if (!ta) return [];
    const n1 = ta.details.node1_website;
    const n2 = ta.details.node2_email;
    const signals: Signal[] = [];

    // Website
    if (n1.website_exists) signals.push({ text: 'Website is online and reachable', type: 'good', icon: 'check' });
    else signals.push({ text: 'No active website detected', type: 'bad', icon: 'x' });

    if (n1.ssl_valid) signals.push({ text: 'Website uses HTTPS (SSL certificate valid)', type: 'good', icon: 'check' });
    else if (n1.website_exists) signals.push({ text: 'Website has no SSL/HTTPS certificate', type: 'bad', icon: 'x' });

    if (n1.domain_age_years !== null) {
      if (n1.domain_age_years >= 3) signals.push({ text: `Domain is ${n1.domain_age_years} years old (well established)`, type: 'good', icon: 'check' });
      else if (n1.domain_age_years >= 1) signals.push({ text: `Domain is ${n1.domain_age_years} year(s) old (relatively recent)`, type: 'warning', icon: 'warn' });
      else signals.push({ text: 'Domain was registered very recently (< 1 year)', type: 'bad', icon: 'x' });
    }

    if (n1.social_links_found.length >= 2) signals.push({ text: `${n1.social_links_found.length} social media profiles detected (${n1.social_links_found.join(', ')})`, type: 'good', icon: 'check' });
    else if (n1.social_links_found.length === 1) signals.push({ text: `1 social profile detected (${n1.social_links_found[0]})`, type: 'warning', icon: 'warn' });
    else signals.push({ text: 'No social media presence detected on the website', type: 'bad', icon: 'x' });

    // Email
    if (n2.email_valid_format) signals.push({ text: 'Email address format is valid', type: 'good', icon: 'check' });
    else signals.push({ text: 'Email address format is invalid', type: 'bad', icon: 'x' });

    if (n2.has_mx_records) signals.push({ text: 'Email domain has active mail server (MX records found)', type: 'good', icon: 'check' });
    else signals.push({ text: 'Email domain has no mail server — address may be fake', type: 'bad', icon: 'x' });

    if (n2.is_professional) signals.push({ text: 'Professional email domain (not Gmail/Hotmail/etc.)', type: 'good', icon: 'check' });
    else signals.push({ text: 'Generic email provider used (Gmail/Hotmail/Yahoo/etc.)', type: 'bad', icon: 'x' });

    if (n2.matches_website) signals.push({ text: 'Email domain matches the company website', type: 'good', icon: 'check' });
    else if (n2.is_professional) signals.push({ text: 'Email domain does not match website domain', type: 'warning', icon: 'warn' });

    if (n2.matches_company_name) signals.push({ text: 'Email domain matches the company name', type: 'good', icon: 'check' });

    return signals;
  }

  getGoodSignals(): Signal[] {
    return this.getSignals().filter(s => s.type === 'good');
  }

  getBadSignals(): Signal[] {
    return this.getSignals().filter(s => s.type !== 'good');
  }

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
    const tips: string[] = [];
    const n1 = ta.details.node1_website;
    const n2 = ta.details.node2_email;

    if (ta.trust_score >= 75) {
      tips.push('All major trust signals are positive. This company appears legitimate.');
    } else if (ta.trust_score >= 45) {
      tips.push('Some signals require attention. Review the negative points carefully before approving.');
    } else {
      tips.push('Multiple risk indicators detected. Consider requesting additional documentation before approving.');
    }

    if (!n1.website_exists) tips.push('Ask the company to provide a valid website URL or official portal link.');
    if (!n1.ssl_valid && n1.website_exists) tips.push('The website is accessible but lacks SSL. This is acceptable for small companies but worth noting.');
    if (!n2.is_professional) tips.push('Request a professional email address (company domain). Generic emails (Gmail, etc.) reduce trust.');
    if (!n2.has_mx_records) tips.push('The email domain has no mail server. Verify the email address directly by phone.');
    if (!n2.matches_website) tips.push('Email domain and website domain don\'t match. Ask the company to clarify or provide both from the same domain.');
    if (n1.social_links_found.length === 0) tips.push('No social media presence found. Ask for LinkedIn or Facebook company page links.');
    if (n1.domain_age_years !== null && n1.domain_age_years < 1) tips.push('The website domain is very recent. Consider requesting older business documents to confirm company age.');
    if (!c.tradeRegister) tips.push('No trade register number provided. This is a required document — request it before approving.');
    if (c.tradeRegister) tips.push(`Trade register: "${c.tradeRegister}" — verify this number with the official national business registry.`);

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

  getPlatformIcon(platform: string): string {
    const icons: Record<string, string> = {
      linkedin: 'in',
      facebook: 'f',
      twitter: 'X',
      instagram: 'ig',
      youtube: '▶',
      github: 'gh',
    };
    return icons[platform.toLowerCase()] ?? platform[0].toUpperCase();
  }

  getPlatformColor(platform: string): string {
    const colors: Record<string, string> = {
      linkedin: '#0077b5',
      facebook: '#1877f2',
      twitter: '#000000',
      instagram: '#e1306c',
      youtube: '#ff0000',
      github: '#24292e',
    };
    return colors[platform.toLowerCase()] ?? '#6b7280';
  }

  approve() {
    const c = this.company();
    if (!c) return;
    this.actionLoading.set(true);
    this.adminService.approveCompany(c.id).subscribe({
      next: () => {
        this.showToast('Company approved successfully', 'success');
        this.actionLoading.set(false);
        setTimeout(() => this.router.navigate(['/admin/verifications']), 1500);
      },
      error: () => {
        this.showToast('Failed to approve company', 'error');
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
        this.showToast('Company rejected', 'success');
        this.showRejectModal.set(false);
        this.actionLoading.set(false);
        setTimeout(() => this.router.navigate(['/admin/verifications']), 1500);
      },
      error: () => {
        this.showToast('Failed to reject company', 'error');
        this.actionLoading.set(false);
      },
    });
  }

  goBack() {
    this.router.navigate(['/admin/verifications']);
  }

  private showToast(text: string, type: 'success' | 'error') {
    this.toastMessage.set({ text, type });
    setTimeout(() => this.toastMessage.set(null), 3500);
  }
}
