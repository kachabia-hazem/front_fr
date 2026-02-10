import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Mission, CreateMissionRequest } from '../models/mission.model';

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
}
