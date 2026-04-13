import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Feedback, SubmitFeedbackRequest } from '../models/feedback.model';

@Injectable({ providedIn: 'root' })
export class FeedbackService {
  private readonly apiUrl     = `${environment.apiUrl}/feedbacks`;
  private readonly adminUrl   = `${environment.apiUrl}/admin/feedbacks`;

  constructor(private http: HttpClient) {}

  // ── User (company / freelancer) ───────────────────────────────────────────

  submitFeedback(req: SubmitFeedbackRequest): Observable<Feedback> {
    return this.http.post<Feedback>(this.apiUrl, req);
  }

  // ── Admin ─────────────────────────────────────────────────────────────────

  getAllFeedbacks(): Observable<Feedback[]> {
    return this.http.get<Feedback[]>(this.adminUrl);
  }

  getPendingFeedbacks(): Observable<Feedback[]> {
    return this.http.get<Feedback[]>(`${this.adminUrl}/pending`);
  }

  validateFeedback(id: string): Observable<Feedback> {
    return this.http.put<Feedback>(`${this.adminUrl}/${id}/validate`, {});
  }

  deleteFeedback(id: string): Observable<void> {
    return this.http.delete<void>(`${this.adminUrl}/${id}`);
  }
}
