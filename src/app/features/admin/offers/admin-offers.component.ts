import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  OffersService,
  PointPack,
  SubscriptionPlan,
  CreatePackRequest,
  CreateSubscriptionRequest,
  UpdatePackRequest,
  UpdateSubscriptionRequest,
  UpdatePromoRequest,
} from '../../../core/services/offers.service';

type OffersTab = 'packs' | 'subscriptions';
type PackCategory = 'DECOUVERTE' | 'POPULAIRE' | 'PRO';

interface PackPromoState {
  promoEnabled: boolean;
  promoDiscountPercent: number;
  promoLabel: string;
  promoExpiresAt: string;
  dirty: boolean;
}

interface SubPromoState {
  promoEnabled: boolean;
  promoDiscountPercent: number;
  promoLabel: string;
  promoExpiresAt: string;
  dirty: boolean;
}

@Component({
  selector: 'app-admin-offers',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-offers.component.html',
  styleUrls: ['./admin-offers.component.css'],
})
export class AdminOffersComponent implements OnInit {
  activeTab = signal<OffersTab>('packs');
  packs = signal<PointPack[]>([]);
  subscriptions = signal<SubscriptionPlan[]>([]);
  loading = signal(false);
  savingId = signal<string | null>(null);
  toast = signal<{ text: string; type: 'success' | 'error' } | null>(null);

  // Edit pack modal
  editPack = signal<PointPack | null>(null);
  editPackForm: UpdatePackRequest = { name: '', points: 0, price: 0, badge: '', active: true, displayOrder: 0 };

  // Edit subscription modal
  editSub = signal<SubscriptionPlan | null>(null);
  editSubForm: UpdateSubscriptionRequest = { name: '', pricePerMonth: 0, pointsPerMonth: 0, advantages: [], active: true, displayOrder: 0 };
  editSubAdvantagesRaw = '';

  // Create pack modal
  showCreatePack = signal(false);
  createPackForm: CreatePackRequest = { name: '', category: 'DECOUVERTE', points: 0, price: 0, badge: '', active: true, displayOrder: 0 };

  // Create subscription modal
  showCreateSub = signal(false);
  createSubForm: CreateSubscriptionRequest = { name: '', pricePerMonth: 0, pointsPerMonth: 0, advantages: [], active: true, displayOrder: 0 };
  createSubAdvantagesRaw = '';

  // Delete confirmations
  confirmDeletePackId = signal<string | null>(null);
  confirmDeleteSubId = signal<string | null>(null);

  // Promo states keyed by id
  packPromos: Record<string, PackPromoState> = {};
  subPromos: Record<string, SubPromoState> = {};

  readonly categories: { key: PackCategory; label: string }[] = [
    { key: 'DECOUVERTE', label: 'Pack Découverte' },
    { key: 'POPULAIRE',  label: 'Pack Populaire'  },
    { key: 'PRO',        label: 'Pack Pro'         },
  ];

  constructor(private offersService: OffersService) {}

  ngOnInit() {
    this.loadAll();
  }

  loadAll() {
    this.loading.set(true);
    this.offersService.getAllPacks().subscribe({
      next: (packs) => {
        this.packs.set(packs);
        this.initPackPromos(packs);
      },
    });
    this.offersService.getAllSubscriptions().subscribe({
      next: (subs) => {
        this.subscriptions.set(subs);
        this.initSubPromos(subs);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  private initPackPromos(packs: PointPack[]) {
    packs.forEach(p => {
      this.packPromos[p.id] = {
        promoEnabled: p.promoEnabled,
        promoDiscountPercent: p.promoDiscountPercent,
        promoLabel: p.promoLabel,
        promoExpiresAt: p.promoExpiresAt ? p.promoExpiresAt.substring(0, 10) : '',
        dirty: false,
      };
    });
  }

  private initSubPromos(subs: SubscriptionPlan[]) {
    subs.forEach(s => {
      this.subPromos[s.id] = {
        promoEnabled: s.promoEnabled,
        promoDiscountPercent: s.promoDiscountPercent,
        promoLabel: s.promoLabel,
        promoExpiresAt: s.promoExpiresAt ? s.promoExpiresAt.substring(0, 10) : '',
        dirty: false,
      };
    });
  }

  // ── Category helpers ───────────────────────────────────────────────────────

  packsForCategory(cat: PackCategory): PointPack[] {
    return this.packs().filter(p => p.category === cat);
  }

  // ── Computed promo price ───────────────────────────────────────────────────

  computedPackPromoPrice(pack: PointPack): number | null {
    const s = this.packPromos[pack.id];
    if (!s || !s.promoEnabled || s.promoDiscountPercent <= 0) return null;
    return Math.round(pack.price * (1 - s.promoDiscountPercent / 100) * 100) / 100;
  }

  computedSubPromoPrice(sub: SubscriptionPlan): number | null {
    const s = this.subPromos[sub.id];
    if (!s || !s.promoEnabled || s.promoDiscountPercent <= 0) return null;
    return Math.round(sub.pricePerMonth * (1 - s.promoDiscountPercent / 100) * 100) / 100;
  }

  // ── Edit Pack ──────────────────────────────────────────────────────────────

  openEditPack(pack: PointPack) {
    this.editPackForm = {
      name: pack.name,
      points: pack.points,
      price: pack.price,
      badge: pack.badge ?? '',
      active: pack.active,
      displayOrder: pack.displayOrder,
    };
    this.editPack.set(pack);
  }

  savePackEdit() {
    const p = this.editPack();
    if (!p) return;
    this.savingId.set(p.id);
    this.offersService.updatePack(p.id, this.editPackForm).subscribe({
      next: (updated) => {
        this.packs.update(arr => arr.map(x => x.id === updated.id ? updated : x));
        this.initPackPromos([updated]);
        this.editPack.set(null);
        this.savingId.set(null);
        this.showToast('Pack mis à jour', 'success');
      },
      error: () => { this.savingId.set(null); this.showToast('Erreur lors de la mise à jour', 'error'); },
    });
  }

  // ── Edit Subscription ─────────────────────────────────────────────────────

  openEditSub(sub: SubscriptionPlan) {
    this.editSubForm = {
      name: sub.name,
      pricePerMonth: sub.pricePerMonth,
      pointsPerMonth: sub.pointsPerMonth,
      advantages: [...sub.advantages],
      active: sub.active,
      displayOrder: sub.displayOrder,
    };
    this.editSubAdvantagesRaw = sub.advantages.join('\n');
    this.editSub.set(sub);
  }

  saveSubEdit() {
    const s = this.editSub();
    if (!s) return;
    this.editSubForm.advantages = this.editSubAdvantagesRaw
      .split('\n')
      .map(l => l.trim())
      .filter(l => l.length > 0);
    this.savingId.set(s.id);
    this.offersService.updateSubscription(s.id, this.editSubForm).subscribe({
      next: (updated) => {
        this.subscriptions.update(arr => arr.map(x => x.id === updated.id ? updated : x));
        this.initSubPromos([updated]);
        this.editSub.set(null);
        this.savingId.set(null);
        this.showToast('Abonnement mis à jour', 'success');
      },
      error: () => { this.savingId.set(null); this.showToast('Erreur lors de la mise à jour', 'error'); },
    });
  }

  // ── Save Pack Promo ────────────────────────────────────────────────────────

  savePackPromo(pack: PointPack) {
    const s = this.packPromos[pack.id];
    if (!s) return;
    const req: UpdatePromoRequest = {
      promoEnabled: s.promoEnabled,
      promoDiscountPercent: s.promoDiscountPercent,
      promoLabel: s.promoLabel,
      promoExpiresAt: s.promoExpiresAt ? s.promoExpiresAt + 'T00:00:00' : null,
    };
    this.savingId.set(pack.id + '_promo');
    this.offersService.updatePackPromo(pack.id, req).subscribe({
      next: (updated) => {
        this.packs.update(arr => arr.map(x => x.id === updated.id ? updated : x));
        this.packPromos[pack.id].dirty = false;
        this.savingId.set(null);
        this.showToast('Promo mise à jour', 'success');
      },
      error: () => { this.savingId.set(null); this.showToast('Erreur promo', 'error'); },
    });
  }

  saveSubPromo(sub: SubscriptionPlan) {
    const s = this.subPromos[sub.id];
    if (!s) return;
    const req: UpdatePromoRequest = {
      promoEnabled: s.promoEnabled,
      promoDiscountPercent: s.promoDiscountPercent,
      promoLabel: s.promoLabel,
      promoExpiresAt: s.promoExpiresAt ? s.promoExpiresAt + 'T00:00:00' : null,
    };
    this.savingId.set(sub.id + '_promo');
    this.offersService.updateSubscriptionPromo(sub.id, req).subscribe({
      next: (updated) => {
        this.subscriptions.update(arr => arr.map(x => x.id === updated.id ? updated : x));
        this.subPromos[sub.id].dirty = false;
        this.savingId.set(null);
        this.showToast('Promo mise à jour', 'success');
      },
      error: () => { this.savingId.set(null); this.showToast('Erreur promo', 'error'); },
    });
  }

  markPackPromoDirty(id: string) {
    if (this.packPromos[id]) this.packPromos[id].dirty = true;
  }

  markSubPromoDirty(id: string) {
    if (this.subPromos[id]) this.subPromos[id].dirty = true;
  }

  private showToast(text: string, type: 'success' | 'error') {
    this.toast.set({ text, type });
    setTimeout(() => this.toast.set(null), 3000);
  }

  // ── Type-safe promo state accessors (avoids TS2532 in strict templates) ────

  isPackPromoActive(id: string): boolean {
    const s = this.packPromos[id];
    return !!(s && s.promoEnabled && s.promoDiscountPercent > 0);
  }

  packPromoEnabled(id: string): boolean {
    return !!this.packPromos[id]?.promoEnabled;
  }

  packPromoDiscountPct(id: string): number {
    return this.packPromos[id]?.promoDiscountPercent ?? 0;
  }

  packPromoDirty(id: string): boolean {
    return !!this.packPromos[id]?.dirty;
  }

  isSubPromoActive(id: string): boolean {
    const s = this.subPromos[id];
    return !!(s && s.promoEnabled && s.promoDiscountPercent > 0);
  }

  subPromoEnabled(id: string): boolean {
    return !!this.subPromos[id]?.promoEnabled;
  }

  subPromoDiscountPct(id: string): number {
    return this.subPromos[id]?.promoDiscountPercent ?? 0;
  }

  subPromoDirty(id: string): boolean {
    return !!this.subPromos[id]?.dirty;
  }

  // ── Create Pack ────────────────────────────────────────────────────────────

  openCreatePack() {
    this.createPackForm = { name: '', category: 'DECOUVERTE', points: 0, price: 0, badge: '', active: true, displayOrder: this.packs().length + 1 };
    this.showCreatePack.set(true);
  }

  submitCreatePack() {
    this.savingId.set('new_pack');
    this.offersService.createPack(this.createPackForm).subscribe({
      next: (created) => {
        this.packs.update(arr => [...arr, created]);
        this.packPromos[created.id] = { promoEnabled: false, promoDiscountPercent: 0, promoLabel: '', promoExpiresAt: '', dirty: false };
        this.showCreatePack.set(false);
        this.savingId.set(null);
        this.showToast('Pack créé', 'success');
      },
      error: () => { this.savingId.set(null); this.showToast('Erreur lors de la création', 'error'); },
    });
  }

  // ── Delete Pack ────────────────────────────────────────────────────────────

  deletePack(id: string) {
    this.savingId.set('del_' + id);
    this.offersService.deletePack(id).subscribe({
      next: () => {
        this.packs.update(arr => arr.filter(p => p.id !== id));
        delete this.packPromos[id];
        this.confirmDeletePackId.set(null);
        this.savingId.set(null);
        this.showToast('Pack supprimé', 'success');
      },
      error: () => { this.savingId.set(null); this.showToast('Erreur lors de la suppression', 'error'); },
    });
  }

  // ── Create Subscription ────────────────────────────────────────────────────

  openCreateSub() {
    this.createSubForm = { name: '', pricePerMonth: 0, pointsPerMonth: 0, advantages: [], active: true, displayOrder: this.subscriptions().length + 1 };
    this.createSubAdvantagesRaw = '';
    this.showCreateSub.set(true);
  }

  submitCreateSub() {
    this.createSubForm.advantages = this.createSubAdvantagesRaw
      .split('\n').map(l => l.trim()).filter(l => l.length > 0);
    this.savingId.set('new_sub');
    this.offersService.createSubscription(this.createSubForm).subscribe({
      next: (created) => {
        this.subscriptions.update(arr => [...arr, created]);
        this.subPromos[created.id] = { promoEnabled: false, promoDiscountPercent: 0, promoLabel: '', promoExpiresAt: '', dirty: false };
        this.showCreateSub.set(false);
        this.savingId.set(null);
        this.showToast('Abonnement créé', 'success');
      },
      error: () => { this.savingId.set(null); this.showToast('Erreur lors de la création', 'error'); },
    });
  }

  // ── Delete Subscription ────────────────────────────────────────────────────

  deleteSub(id: string) {
    this.savingId.set('del_' + id);
    this.offersService.deleteSubscription(id).subscribe({
      next: () => {
        this.subscriptions.update(arr => arr.filter(s => s.id !== id));
        delete this.subPromos[id];
        this.confirmDeleteSubId.set(null);
        this.savingId.set(null);
        this.showToast('Abonnement supprimé', 'success');
      },
      error: () => { this.savingId.set(null); this.showToast('Erreur lors de la suppression', 'error'); },
    });
  }

  formatTND(amount: number): string {
    return amount.toFixed(3).replace('.', ',') + ' DT';
  }
}
