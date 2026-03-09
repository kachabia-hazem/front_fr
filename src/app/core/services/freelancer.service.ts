import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Freelancer } from '../models';

export interface AiFreelancerSearchResult {
  freelancer: Freelancer;
  score: number;
}

export interface UpdateFreelancerRequest {
  firstName?: string;
  lastName?: string;
  gender?: string;
  dateOfBirth?: string;
  phoneNumber?: string;
  yearsOfExperience?: number;
  profileTypes?: string[];
  tjm?: number;
  languages?: string[];
  currentPosition?: string;
  location?: string;
  country?: string;
  postalCode?: string;
  city?: string;
  postalAddress?: string;
  bio?: string;
  skills?: string[];
  portfolioUrl?: string;
}

@Injectable({ providedIn: 'root' })
export class FreelancerService {
  private readonly apiUrl = `${environment.apiUrl}/freelancer`;

  constructor(private http: HttpClient) {}

  getMyProfile(): Observable<Freelancer> {
    return this.http.get<Freelancer>(`${this.apiUrl}/me`);
  }

  updateMyProfile(data: UpdateFreelancerRequest): Observable<Freelancer> {
    return this.http.put<Freelancer>(`${this.apiUrl}/me`, data);
  }

  getFreelancerById(id: string): Observable<Freelancer> {
    return this.http.get<Freelancer>(`${this.apiUrl}/public/${id}`);
  }

  getAllFreelancers(): Observable<Freelancer[]> {
    return this.http.get<Freelancer[]>(`${this.apiUrl}/public/all`);
  }

  recordProfileView(freelancerId: string): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/public/${freelancerId}/view`, null);
  }

  recordSearchAppearances(ids: string[]): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/public/batch-appearances`, ids);
  }

  aiSearch(prompt: string, topK: number = 20): Observable<AiFreelancerSearchResult[]> {
    const params = new HttpParams().set('prompt', prompt).set('topK', topK);
    return this.http.get<AiFreelancerSearchResult[]>(`${this.apiUrl}/public/ai-search`, { params });
  }
}
