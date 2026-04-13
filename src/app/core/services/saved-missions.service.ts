import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Mission } from '../models/mission.model';

@Injectable({ providedIn: 'root' })
export class SavedMissionsService {
  private readonly base = `${environment.apiUrl}/freelancer/saved-missions`;

  /** Reactive set of saved mission IDs — drives heart-icon state across the app */
  private readonly _savedIds = signal<Set<string>>(new Set());
  readonly savedIds = this._savedIds.asReadonly();

  constructor(private http: HttpClient) {}

  /** Load saved IDs from the server (call once per session for freelancers). */
  load(): void {
    this.http.get<string[]>(this.base).subscribe({
      next: (ids) => this._savedIds.set(new Set(ids)),
    });
  }

  /** Toggle save/unsave — updates local signal immediately from server response. */
  toggle(missionId: string): Observable<string[]> {
    return this.http.post<string[]>(`${this.base}/${missionId}`, {}).pipe(
      tap((ids) => this._savedIds.set(new Set(ids))),
    );
  }

  isSaved(missionId: string): boolean {
    return this._savedIds().has(missionId);
  }

  /** Fetch full mission objects for the saved list page. */
  getSavedMissions(): Observable<Mission[]> {
    return this.http.get<Mission[]>(`${this.base}/details`);
  }
}
