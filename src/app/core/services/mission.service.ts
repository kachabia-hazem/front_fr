import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Mission, CreateMissionRequest } from '../models/mission.model';

export interface AiSearchResult {
  mission: Mission;
  score: number;
}

export interface MatchMissionResult {
  score: number;
  skillScore: number;
  semanticScore: number;
  matchedSkills: string[];
  missingSkills: string[];
  recommendation: string;
  explanation: string;
}

@Injectable({ providedIn: 'root' })
export class MissionService {
  private readonly apiUrl = `${environment.apiUrl}/missions`;

  constructor(private http: HttpClient) {}

  createMission(data: CreateMissionRequest): Observable<Mission> {
    return this.http.post<Mission>(this.apiUrl, data);
  }

  getMyMissions(): Observable<Mission[]> {
    return this.http.get<Mission[]>(`${this.apiUrl}/my`);
  }

  getAllMissions(): Observable<Mission[]> {
    return this.http.get<Mission[]>(`${this.apiUrl}/public/all`);
  }

  getMissionById(id: string): Observable<Mission> {
    return this.http.get<Mission>(`${this.apiUrl}/public/${id}`);
  }

  updateMission(id: string, data: CreateMissionRequest): Observable<Mission> {
    return this.http.put<Mission>(`${this.apiUrl}/${id}`, data);
  }

  deleteMission(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  /**
   * Recherche sémantique par AI — retourne les missions triées par pertinence avec score
   */
  aiSearch(prompt: string, topK: number = 10): Observable<AiSearchResult[]> {
    const params = new HttpParams()
      .set('prompt', prompt)
      .set('topK', topK.toString());
    return this.http.get<AiSearchResult[]>(`${this.apiUrl}/public/ai-search`, { params });
  }

  /**
   * Recommandations de missions basées sur le profil du freelancer connecté
   */
  getRecommendedMissions(topK: number = 6): Observable<AiSearchResult[]> {
    const params = new HttpParams().set('topK', topK.toString());
    return this.http.get<AiSearchResult[]>(`${this.apiUrl}/recommended`, { params });
  }

  /**
   * Calcule la compatibilité (rapide, ~2s, sans LLM)
   */
  matchMission(missionId: string): Observable<MatchMissionResult> {
    return this.http.get<MatchMissionResult>(`${this.apiUrl}/${missionId}/match`);
  }

  /**
   * Récupère l'explication IA complète (LLM, ~30s) — appelé en arrière-plan
   */
  matchMissionExplain(missionId: string): Observable<MatchMissionResult> {
    return this.http.get<MatchMissionResult>(`${this.apiUrl}/${missionId}/match/explain`);
  }
}
