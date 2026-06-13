import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CreateReportRequest, Report, ReportStatus } from '../models/report.model';

@Injectable({ providedIn: 'root' })
export class ReportService {
  private readonly apiUrl   = `${environment.apiUrl}/reports`;
  private readonly adminUrl = `${environment.apiUrl}/admin/reports`;

  constructor(private http: HttpClient) {}

  createReport(req: CreateReportRequest): Observable<Report> {
    return this.http.post<Report>(this.apiUrl, req);
  }

  createPublicReport(email: string, req: CreateReportRequest): Observable<Report> {
    return this.http.post<Report>(`${this.apiUrl}/public`, { email, ...req });
  }

  getAllReports(status?: ReportStatus): Observable<Report[]> {
    const params = status ? `?status=${status}` : '';
    return this.http.get<Report[]>(`${this.adminUrl}${params}`);
  }

  getReport(id: string): Observable<Report> {
    return this.http.get<Report>(`${this.adminUrl}/${id}`);
  }

  updateStatus(id: string, status: ReportStatus): Observable<Report> {
    return this.http.put<Report>(`${this.adminUrl}/${id}/status`, { status });
  }

  rejectReport(id: string, reason: string): Observable<Report> {
    return this.http.post<Report>(`${this.adminUrl}/${id}/reject`, { reason });
  }

  getStats(): Observable<Record<string, number>> {
    return this.http.get<Record<string, number>>(`${this.adminUrl}/stats`);
  }
}
