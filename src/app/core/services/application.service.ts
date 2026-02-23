import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Application, CreateApplicationRequest } from '../models/application.model';

@Injectable({ providedIn: 'root' })
export class ApplicationService {
  private readonly apiUrl = `${environment.apiUrl}/applications`;

  constructor(private http: HttpClient) {}

  submitApplication(data: CreateApplicationRequest): Observable<Application> {
    return this.http.post<Application>(this.apiUrl, data);
  }

  getMyApplications(): Observable<Application[]> {
    return this.http.get<Application[]>(`${this.apiUrl}/my`);
  }

  checkIfApplied(missionId: string): Observable<boolean> {
    return this.http.get<boolean>(`${this.apiUrl}/check/${missionId}`);
  }

  withdrawApplication(missionId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/withdraw/${missionId}`);
  }

  getCompanyApplications(): Observable<Application[]> {
    return this.http.get<Application[]>(`${this.apiUrl}/company`);
  }

  getMissionApplications(missionId: string): Observable<Application[]> {
    return this.http.get<Application[]>(`${this.apiUrl}/mission/${missionId}`);
  }

  updateApplicationStatus(applicationId: string, status: 'ACCEPTED' | 'REJECTED'): Observable<Application> {
    return this.http.patch<Application>(`${this.apiUrl}/${applicationId}/status`, null, {
      params: { status },
    });
  }
}
