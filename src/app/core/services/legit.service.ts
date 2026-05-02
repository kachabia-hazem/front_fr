import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CreateLegitRequest, Legit, LegitStatus } from '../models/legit.model';

@Injectable({ providedIn: 'root' })
export class LegitService {
  private readonly apiUrl   = `${environment.apiUrl}/legits`;
  private readonly adminUrl = `${environment.apiUrl}/admin/legits`;
  private readonly filesUrl = `${environment.apiUrl}/files/legit-evidence`;

  constructor(private http: HttpClient) {}

  createLegit(req: CreateLegitRequest): Observable<Legit> {
    return this.http.post<Legit>(this.apiUrl, req);
  }

  uploadEvidence(file: File): Observable<{ url: string }> {
    const form = new FormData();
    form.append('file', file);
    return this.http.post<{ url: string }>(this.filesUrl, form);
  }

  getAllLegits(status?: LegitStatus): Observable<Legit[]> {
    const params = status ? `?status=${status}` : '';
    return this.http.get<Legit[]>(`${this.adminUrl}${params}`);
  }

  getLegit(id: string): Observable<Legit> {
    return this.http.get<Legit>(`${this.adminUrl}/${id}`);
  }

  updateStatus(id: string, status: LegitStatus): Observable<Legit> {
    return this.http.put<Legit>(`${this.adminUrl}/${id}/status`, { status });
  }

  sendEmail(id: string, subject: string, body: string): Observable<Legit> {
    return this.http.post<Legit>(`${this.adminUrl}/${id}/send-email`, { subject, body });
  }

  getStats(): Observable<Record<string, number>> {
    return this.http.get<Record<string, number>>(`${this.adminUrl}/stats`);
  }
}
