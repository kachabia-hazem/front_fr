import { Component, OnInit, signal, computed, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import {
  AdminService, AdminStats,
  UserEvolutionPoint, ContractEvolutionPoint,
  AdminPaymentOverview,
} from '../../../core/services/admin.service';

interface ChartPt { x: number; y: number; rawVal: number; }
interface TooltipState {
  visible: boolean;
  x: number;
  y: number;
  lines: { label: string; color: string; value: number }[];
  month: string;
}

import { Subscription } from 'rxjs';

@Component({
  selector: 'app-admin-overview',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslateModule],
  templateUrl: './admin-overview.component.html',
  styleUrls: ['./admin-overview.component.css'],
})
export class AdminOverviewComponent implements OnInit, OnDestroy{

  // ─── KPI stats ────────────────────────────────────────────────────────────
  stats       = signal<AdminStats | null>(null);
  loading     = signal(true);
  error       = signal<string | null>(null);

  // ─── Chart data ───────────────────────────────────────────────────────────
  period      = signal<6 | 12>(12);
  usersData   = signal<UserEvolutionPoint[]>([]);
  contractsData = signal<ContractEvolutionPoint[]>([]);
  chartLoading  = signal(false);

  // ─── Hover / tooltip ──────────────────────────────────────────────────────
  userTooltip     = signal<TooltipState>({ visible: false, x: 0, y: 0, lines: [], month: '' });
  contractTooltip = signal<TooltipState>({ visible: false, x: 0, y: 0, lines: [], month: '' });

  // ─── SVG layout constants ─────────────────────────────────────────────────
  private langSub?: Subscription;

  readonly VW = 660;
  readonly VH = 220;
  readonly PT = 18; // pad top
  readonly PR = 16; // pad right
  readonly PB = 38; // pad bottom
  readonly PL = 42; // pad left
  get IW() { return this.VW - this.PL - this.PR; }
  get IH() { return this.VH - this.PT - this.PB; }

  // ─── Computed chart geometry ──────────────────────────────────────────────

  usersChart = computed(() => {
    const data = this.usersData();
    if (!data.length) return null;
    return this.buildUsersChart(data);
  });

  contractsChart = computed(() => {
    const data = this.contractsData();
    if (!data.length) return null;
    return this.buildContractsChart(data);
  });

  // ─── Payment analytics ────────────────────────────────────────────────────
  paymentOverview = signal<AdminPaymentOverview | null>(null);

  constructor(
    private adminService: AdminService, private translate: TranslateService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.langSub = this.translate.onLangChange.subscribe(() => this.cdr.markForCheck());
    this.adminService.getStats().subscribe({
      next: (d) => { this.stats.set(d); this.loading.set(false); },
      error: () => { this.error.set('Failed to load stats'); this.loading.set(false); },
    });
    this.loadCharts();
    this.loadPaymentData();
  }

  private loadPaymentData(): void {
    this.adminService.getPaymentOverview().subscribe({ next: (d) => this.paymentOverview.set(d), error: () => {} });
  }

  setPeriod(p: 6 | 12) {
    this.period.set(p);
    this.loadCharts();
  }

  private loadCharts() {
    const m = this.period();
    this.chartLoading.set(true);
    this.adminService.getUsersEvolution(m).subscribe({
      next: (d) => { this.usersData.set(d); this.checkChartsLoaded(); },
      error: () => this.checkChartsLoaded(),
    });
    this.adminService.getContractsEvolution(m).subscribe({
      next: (d) => { this.contractsData.set(d); this.checkChartsLoaded(); },
      error: () => this.checkChartsLoaded(),
    });
  }

  private _loadedCount = 0;
  private checkChartsLoaded() {
    this._loadedCount++;
    if (this._loadedCount >= 2) { this.chartLoading.set(false); this._loadedCount = 0; }
  }

  // ─── Chart geometry builders ──────────────────────────────────────────────

  private toX(i: number, n: number): number {
    if (n === 1) return this.PL + this.IW / 2;
    return this.PL + (i / (n - 1)) * this.IW;
  }

  private toY(v: number, maxV: number): number {
    return this.PT + this.IH - (maxV > 0 ? (v / maxV) * this.IH : 0);
  }

  private smoothPath(pts: ChartPt[]): string {
    if (!pts.length) return '';
    let d = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 1; i < pts.length; i++) {
      const p = pts[i - 1], c = pts[i];
      const cx1 = p.x + (c.x - p.x) * 0.45;
      const cx2 = c.x - (c.x - p.x) * 0.45;
      d += ` C ${cx1} ${p.y} ${cx2} ${c.y} ${c.x} ${c.y}`;
    }
    return d;
  }

  private areaPath(pts: ChartPt[], bottom: number): string {
    if (!pts.length) return '';
    const first = pts[0], last = pts[pts.length - 1];
    let d = `M ${first.x} ${bottom} L ${first.x} ${first.y}`;
    for (let i = 1; i < pts.length; i++) {
      const p = pts[i - 1], c = pts[i];
      const cx1 = p.x + (c.x - p.x) * 0.45;
      const cx2 = c.x - (c.x - p.x) * 0.45;
      d += ` C ${cx1} ${p.y} ${cx2} ${c.y} ${c.x} ${c.y}`;
    }
    d += ` L ${last.x} ${bottom} Z`;
    return d;
  }

  private yLabels(maxV: number): { y: number; label: string }[] {
    const steps = 4;
    const labels = [];
    for (let i = 0; i <= steps; i++) {
      const v = Math.round((maxV * i) / steps);
      labels.push({ y: this.toY(v, maxV), label: v > 999 ? `${(v / 1000).toFixed(1)}k` : `${v}` });
    }
    return labels;
  }

  private buildUsersChart(data: UserEvolutionPoint[]) {
    const n = data.length;
    const maxV = Math.max(...data.map(d => d.total), 1);
    const bottom = this.PT + this.IH;

    const totalPts:      ChartPt[] = data.map((d, i) => ({ x: this.toX(i, n), y: this.toY(d.total, maxV),      rawVal: d.total }));
    const freelancerPts: ChartPt[] = data.map((d, i) => ({ x: this.toX(i, n), y: this.toY(d.freelancers, maxV), rawVal: d.freelancers }));
    const companyPts:    ChartPt[] = data.map((d, i) => ({ x: this.toX(i, n), y: this.toY(d.companies, maxV),   rawVal: d.companies }));

    const colW = n > 1 ? this.IW / (n - 1) : this.IW;

    return {
      data,
      maxV,
      bottom,
      totalPath:      this.smoothPath(totalPts),
      freelancerPath: this.smoothPath(freelancerPts),
      companyPath:    this.smoothPath(companyPts),
      totalArea:      this.areaPath(totalPts, bottom),
      freelancerArea: this.areaPath(freelancerPts, bottom),
      companyArea:    this.areaPath(companyPts, bottom),
      totalPts,
      freelancerPts,
      companyPts,
      yLabels: this.yLabels(maxV),
      xLabels: data.map((d, i) => ({
        x: this.toX(i, n),
        label: this.shortMonth(d.month, n),
        show: this.shouldShowLabel(i, n),
      })),
      hoverZones: data.map((d, i) => ({
        x: this.toX(i, n) - colW / 2,
        width: colW,
        cx: this.toX(i, n),
        idx: i,
      })),
    };
  }

  private buildContractsChart(data: ContractEvolutionPoint[]) {
    const n = data.length;
    const maxV = Math.max(...data.map(d => d.total), 1);
    const bottom = this.PT + this.IH;

    const totalPts:    ChartPt[] = data.map((d, i) => ({ x: this.toX(i, n), y: this.toY(d.total,    maxV), rawVal: d.total }));
    const signedPts:   ChartPt[] = data.map((d, i) => ({ x: this.toX(i, n), y: this.toY(d.signed,   maxV), rawVal: d.signed }));
    const finishedPts: ChartPt[] = data.map((d, i) => ({ x: this.toX(i, n), y: this.toY(d.finished, maxV), rawVal: d.finished }));

    const colW = n > 1 ? this.IW / (n - 1) : this.IW;

    return {
      data,
      maxV,
      bottom,
      totalPath:    this.smoothPath(totalPts),
      signedPath:   this.smoothPath(signedPts),
      finishedPath: this.smoothPath(finishedPts),
      totalArea:    this.areaPath(totalPts, bottom),
      signedArea:   this.areaPath(signedPts, bottom),
      finishedArea: this.areaPath(finishedPts, bottom),
      totalPts,
      signedPts,
      finishedPts,
      yLabels: this.yLabels(maxV),
      xLabels: data.map((d, i) => ({
        x: this.toX(i, n),
        label: this.shortMonth(d.month, n),
        show: this.shouldShowLabel(i, n),
      })),
      hoverZones: data.map((d, i) => ({
        x: this.toX(i, n) - colW / 2,
        width: colW,
        cx: this.toX(i, n),
        idx: i,
      })),
    };
  }

  private shortMonth(monthLabel: string, total: number): string {
    if (total <= 7) return monthLabel;
    const parts = monthLabel.split(' ');
    return parts.length === 2 ? `${parts[0]} ${parts[1].slice(2)}` : monthLabel;
  }

  private shouldShowLabel(i: number, n: number): boolean {
    if (n <= 7) return true;
    if (n <= 12) return i % 2 === 0 || i === n - 1;
    return i % 3 === 0 || i === n - 1;
  }

  // ─── Hover handlers ───────────────────────────────────────────────────────

  onUserHover(zone: { cx: number; idx: number }) {
    const chart = this.usersChart();
    if (!chart) return;
    const d = chart.data[zone.idx];
    const tPt = chart.totalPts[zone.idx];
    this.userTooltip.set({
      visible: true,
      x: zone.cx,
      y: Math.min(tPt.y, this.PT + 8),
      lines: [
        { label: this.translate.instant('admin_overview.lbl_total'),       color: '#1a1a2e', value: d.total },
        { label: this.translate.instant('admin_overview.lbl_freelancers'), color: '#3793B0', value: d.freelancers },
        { label: this.translate.instant('admin_overview.lbl_companies'),   color: '#4a9a8e', value: d.companies },
      ],
      month: d.month,
    });
  }

  onUserLeave() {
    this.userTooltip.update(t => ({ ...t, visible: false }));
  }

  onContractHover(zone: { cx: number; idx: number }) {
    const chart = this.contractsChart();
    if (!chart) return;
    const d = chart.data[zone.idx];
    const tPt = chart.totalPts[zone.idx];
    this.contractTooltip.set({
      visible: true,
      x: zone.cx,
      y: Math.min(tPt.y, this.PT + 8),
      lines: [
        { label: this.translate.instant('admin_overview.lbl_total'),    color: '#8b5cf6', value: d.total },
        { label: this.translate.instant('admin_overview.lbl_signed'),   color: '#10b981', value: d.signed },
        { label: this.translate.instant('admin_overview.lbl_finished'), color: '#3793B0', value: d.finished },
      ],
      month: d.month,
    });
  }

  onContractLeave() {
    this.contractTooltip.update(t => ({ ...t, visible: false }));
  }

  // ─── Payment helpers ──────────────────────────────────────────────────────

  formatTND(amount: number | null | undefined): string {
    if (amount == null) return '—';
    return amount.toFixed(3).replace('.', ',') + ' DT';
  }


  ngOnDestroy(): void {
    this.langSub?.unsubscribe();
  }
}
