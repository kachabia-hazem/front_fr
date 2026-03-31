import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ActiveMission, ActiveMissionStatus, Task, Deliverable, GitActivityResponse } from '../models/active-mission.model';

@Injectable({ providedIn: 'root' })
export class ActiveMissionService {
  private readonly apiUrl = `${environment.apiUrl}/active-missions`;

  constructor(private http: HttpClient) {}

  // ── Mission listings ──────────────────────────────────────────────────────

  getFreelancerMissions(): Observable<ActiveMission[]> {
    return this.http.get<ActiveMission[]>(`${this.apiUrl}/freelancer`);
  }

  getCompanyMissions(): Observable<ActiveMission[]> {
    return this.http.get<ActiveMission[]>(`${this.apiUrl}/company`);
  }

  getMission(id: string): Observable<ActiveMission> {
    return this.http.get<ActiveMission>(`${this.apiUrl}/${id}`);
  }

  // ── Kanban Tasks ──────────────────────────────────────────────────────────

  getTasks(missionId: string): Observable<Task[]> {
    return this.http.get<Task[]>(`${this.apiUrl}/${missionId}/tasks`);
  }

  createTask(missionId: string, title: string, description?: string): Observable<Task> {
    return this.http.post<Task>(`${this.apiUrl}/${missionId}/tasks`, { title, description });
  }

  updateTask(missionId: string, taskId: string, updates: Partial<Pick<Task, 'title' | 'description' | 'status'>>): Observable<Task> {
    return this.http.put<Task>(`${this.apiUrl}/${missionId}/tasks/${taskId}`, updates);
  }

  deleteTask(missionId: string, taskId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${missionId}/tasks/${taskId}`);
  }

  // ── Deliverables ──────────────────────────────────────────────────────────

  getDeliverables(missionId: string): Observable<Deliverable[]> {
    return this.http.get<Deliverable[]>(`${this.apiUrl}/${missionId}/deliverables`);
  }

  uploadDeliverable(missionId: string, file: File, description?: string): Observable<Deliverable> {
    const formData = new FormData();
    formData.append('file', file);
    if (description) formData.append('description', description);
    return this.http.post<Deliverable>(`${this.apiUrl}/${missionId}/deliverables`, formData);
  }

  // ── Git Activity ──────────────────────────────────────────────────────────

  validateGitUrl(missionId: string, url: string): Observable<{ valid: boolean; message: string }> {
    return this.http.get<{ valid: boolean; message: string }>(
      `${this.apiUrl}/${missionId}/git-validate`,
      { params: { url } }
    );
  }

  setGitRepoUrl(missionId: string, gitRepositoryUrl: string): Observable<ActiveMission> {
    return this.http.put<ActiveMission>(`${this.apiUrl}/${missionId}/git-repo`, { gitRepositoryUrl });
  }

  refreshGitActivity(missionId: string): Observable<GitActivityResponse> {
    return this.http.get<GitActivityResponse>(`${this.apiUrl}/${missionId}/git-refresh`);
  }

  // ── Status ────────────────────────────────────────────────────────────────

  updateStatus(missionId: string, status: ActiveMissionStatus): Observable<ActiveMission> {
    return this.http.patch<ActiveMission>(`${this.apiUrl}/${missionId}/status`, { status });
  }

  // ── Mission Validation ────────────────────────────────────────────────────

  /** Freelancer: submit mission as done */
  submitMission(missionId: string, note?: string): Observable<ActiveMission> {
    return this.http.post<ActiveMission>(`${this.apiUrl}/${missionId}/submit`, { note });
  }

  /** Company: approve or request revision */
  validateMission(missionId: string, approved: boolean, note?: string, rating?: number): Observable<ActiveMission> {
    return this.http.post<ActiveMission>(`${this.apiUrl}/${missionId}/validate`, { approved, note, rating });
  }

  /** Company: get missions waiting for validation */
  getPendingValidations(): Observable<ActiveMission[]> {
    return this.http.get<ActiveMission[]>(`${this.apiUrl}/pending-validation`);
  }

  /** Freelancer: remove a completed mission from history */
  deleteFromHistory(missionId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${missionId}/history`);
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  getFileUrl(relativePath: string | null | undefined): string {
    if (!relativePath) return '';
    const baseUrl = environment.apiUrl.replace(/\/api$/, '');
    return baseUrl + relativePath;
  }
}
