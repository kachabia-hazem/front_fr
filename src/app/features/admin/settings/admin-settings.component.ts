import { Component, OnInit, signal, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AdminService } from '../../../core/services/admin.service';
import { LanguageService, AppLanguage } from '../../../core/services/language.service';

import { Subscription } from 'rxjs';

@Component({
  selector: 'app-admin-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule],
  templateUrl: './admin-settings.component.html',
  styleUrl: './admin-settings.component.css',
})
export class AdminSettingsComponent implements OnInit, OnDestroy{

  // ─── Platform fee ─────────────────────────────────────────────────────────
  currentFee    = signal(7);
  newFee        = signal(7);
  feeLoading    = signal(false);
  feeSuccess    = signal('');
  feeError      = signal('');

  // ─── Point costs ──────────────────────────────────────────────────────────
  applicationCost    = signal(3);
  aiMatchingCost     = signal(5);
  aiRankingCost      = signal(5);
  newAppCost         = signal(3);
  newAiMatchCost     = signal(5);
  newAiRankCost      = signal(5);
  welcomeBonus       = signal(25);
  newWelcomeBonus    = signal(25);
  costsLoading       = signal(false);
  costsSuccess       = signal('');
  costsError         = signal('');

  // ─── Active section ───────────────────────────────────────────────────────
  activeSection = signal<'commission' | 'points' | 'password' | 'language'>('commission');

  // ─── Language ─────────────────────────────────────────────────────────────
  selectedLanguage = signal<AppLanguage>('en');
  langSuccess = signal('');

  // ─── Change password ──────────────────────────────────────────────────────
  currentPassword = signal('');
  newPassword     = signal('');
  confirmPassword = signal('');
  pwdLoading      = signal(false);
  pwdSuccess      = signal('');
  pwdError        = signal('');
  showCurrentPwd  = signal(false);
  showNewPwd      = signal(false);
  showConfirmPwd  = signal(false);

  private langSub?: Subscription;

    constructor(
  private adminService: AdminService,
    private languageService: LanguageService,
    private translate: TranslateService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.langSub = this.translate.onLangChange.subscribe(() => this.cdr.markForCheck());
    this.selectedLanguage.set(this.languageService.currentLang());
    this.adminService.getSettings().subscribe({
      next: (s) => {
        this.currentFee.set(s.platformFeePercent);
        this.newFee.set(s.platformFeePercent);
        this.applicationCost.set(s.applicationCost);
        this.aiMatchingCost.set(s.aiMatchingCost);
        this.aiRankingCost.set(s.aiRankingCost);
        this.newAppCost.set(s.applicationCost);
        this.newAiMatchCost.set(s.aiMatchingCost);
        this.newAiRankCost.set(s.aiRankingCost);
      },
    });
  }

  saveFee(): void {
    const val = this.newFee();
    if (val < 1 || val > 50) {
      this.feeError.set(this.translate.instant('admin_settings.commission_error_range'));
      return;
    }
    this.feeLoading.set(true);
    this.feeError.set('');
    this.feeSuccess.set('');

    this.adminService.updatePlatformFee(val).subscribe({
      next: (s) => {
        this.currentFee.set(s.platformFeePercent);
        this.newFee.set(s.platformFeePercent);
        this.feeLoading.set(false);
        this.feeSuccess.set(this.translate.instant('admin_settings.commission_success'));
        setTimeout(() => this.feeSuccess.set(''), 3500);
      },
      error: (err) => {
        this.feeLoading.set(false);
        this.feeError.set(err?.error?.message ?? this.translate.instant('admin_settings.commission_error_fail'));
      },
    });
  }

  saveCosts(): void {
    const app     = this.newAppCost();
    const match   = this.newAiMatchCost();
    const rank    = this.newAiRankCost();
    const welcome = this.newWelcomeBonus();
    if ([app, match, rank].some(v => v < 1 || v > 100)) {
      this.costsError.set(this.translate.instant('admin_settings.points_error_range'));
      return;
    }
    if (welcome < 0 || welcome > 500) {
      this.costsError.set(this.translate.instant('admin_settings.points_error_welcome'));
      return;
    }
    this.costsLoading.set(true);
    this.costsError.set('');
    this.costsSuccess.set('');

    this.adminService.updatePointCosts(app, match, rank, welcome).subscribe({
      next: (s) => {
        this.applicationCost.set(s.applicationCost);
        this.aiMatchingCost.set(s.aiMatchingCost);
        this.aiRankingCost.set(s.aiRankingCost);
        this.welcomeBonus.set(s.welcomeBonus);
        this.newAppCost.set(s.applicationCost);
        this.newAiMatchCost.set(s.aiMatchingCost);
        this.newAiRankCost.set(s.aiRankingCost);
        this.newWelcomeBonus.set(s.welcomeBonus);
        this.costsLoading.set(false);
        this.costsSuccess.set(this.translate.instant('admin_settings.points_success'));
        setTimeout(() => this.costsSuccess.set(''), 3500);
      },
      error: (err) => {
        this.costsLoading.set(false);
        this.costsError.set(err?.error?.message ?? this.translate.instant('admin_settings.points_error_fail'));
      },
    });
  }

  saveLanguage(): void {
    this.languageService.setLanguage(this.selectedLanguage());
    this.langSuccess.set(this.translate.instant('admin_settings.language_success'));
    setTimeout(() => this.langSuccess.set(''), 3500);
  }

  savePassword(): void {
    this.pwdError.set('');
    this.pwdSuccess.set('');

    if (!this.currentPassword() || !this.newPassword() || !this.confirmPassword()) {
      this.pwdError.set(this.translate.instant('admin_settings.password_error_empty'));
      return;
    }
    if (this.newPassword().length < 6) {
      this.pwdError.set(this.translate.instant('admin_settings.password_error_length'));
      return;
    }
    if (this.newPassword() !== this.confirmPassword()) {
      this.pwdError.set(this.translate.instant('admin_settings.password_error_match'));
      return;
    }

    this.pwdLoading.set(true);
    this.adminService.changePassword(this.currentPassword(), this.newPassword()).subscribe({
      next: () => {
        this.pwdLoading.set(false);
        this.pwdSuccess.set(this.translate.instant('admin_settings.password_success'));
        this.currentPassword.set('');
        this.newPassword.set('');
        this.confirmPassword.set('');
        setTimeout(() => this.pwdSuccess.set(''), 3500);
      },
      error: (err) => {
        this.pwdLoading.set(false);
        this.pwdError.set(err?.error?.message ?? this.translate.instant('admin_settings.password_error_fail'));
      },
    });
  }

  ngOnDestroy(): void {
    this.langSub?.unsubscribe();
  }
}
