import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Company } from '../models';

export interface UpdateCompanyRequest {
  companyName?: string;
  address?: string;
  websiteUrl?: string;
  legalForm?: string;
  tradeRegister?: string;
  foundationDate?: string;
  businessSector?: string;
  managerName?: string;
  managerEmail?: string;
  managerPosition?: string;
  managerPhoneNumber?: string;
  description?: string;
  numberOfEmployees?: number;
}

@Injectable({ providedIn: 'root' })
export class CompanyService {
  private readonly apiUrl = `${environment.apiUrl}/company`;

  constructor(private http: HttpClient) {}

  getMyProfile(): Observable<Company> {
    return this.http.get<Company>(`${this.apiUrl}/me`);
  }

  updateMyProfile(data: UpdateCompanyRequest): Observable<Company> {
    return this.http.put<Company>(`${this.apiUrl}/me`, data);
  }

  getCompanyById(id: string): Observable<Company> {
    return this.http.get<Company>(`${this.apiUrl}/public/${id}`);
  }

  getAllCompanies(): Observable<Company[]> {
    return this.http.get<Company[]>(`${this.apiUrl}/public/all`);
  }

  uploadCompanyLogo(file: File): Observable<{ url: string }> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<{ url: string }>(`${environment.apiUrl}/files/company-logos`, formData);
  }

  updateCompanyLogoUrl(logoUrl: string): Observable<Company> {
    return this.http.put<Company>(`${this.apiUrl}/me/logo`, { companyLogo: logoUrl });
  }
}
