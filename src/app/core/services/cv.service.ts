import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Freelancer, CvData } from '../models';

@Injectable({ providedIn: 'root' })
export class CvService {
  private readonly apiUrl = `${environment.apiUrl}/freelancer`;
  private readonly filesUrl = `${environment.apiUrl}/files`;

  constructor(private http: HttpClient) {}

  updateCvData(cvData: CvData): Observable<Freelancer> {
    return this.http.put<Freelancer>(`${this.apiUrl}/me/cv`, cvData);
  }

  uploadCertificate(file: File): Observable<{ url: string }> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<{ url: string }>(`${this.filesUrl}/certificates`, formData);
  }

  uploadProfilePicture(file: File): Observable<{ url: string }> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<{ url: string }>(`${this.filesUrl}/profile-pictures`, formData);
  }

  uploadCv(file: File): Observable<{ url: string }> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<{ url: string }>(`${this.filesUrl}/cvs`, formData);
  }

  updateProfilePictureUrl(pictureUrl: string): Observable<Freelancer> {
    return this.http.put<Freelancer>(`${this.apiUrl}/me/profile-picture`, { profilePicture: pictureUrl });
  }

  updateCvUrl(cvUrl: string): Observable<Freelancer> {
    return this.http.put<Freelancer>(`${this.apiUrl}/me/cv-url`, { cvUrl });
  }

  uploadPortfolioImage(file: File): Observable<{ url: string }> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<{ url: string }>(`${this.filesUrl}/portfolio-images`, formData);
  }

  updateCardCustomization(data: { cardBackground?: string; portfolioImages?: string[] }): Observable<Freelancer> {
    return this.http.put<Freelancer>(`${this.apiUrl}/me/card-customization`, data);
  }
}
