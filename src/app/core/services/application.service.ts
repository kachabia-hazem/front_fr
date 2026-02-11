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
}
