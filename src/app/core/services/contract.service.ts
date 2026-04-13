import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Contract } from '../models/contract.model';

@Injectable({ providedIn: 'root' })
export class ContractService {
  private readonly apiUrl = `${environment.apiUrl}/contracts`;

  constructor(private http: HttpClient) {}

  getFreelancerContracts(): Observable<Contract[]> {
    return this.http.get<Contract[]>(`${this.apiUrl}/freelancer`);
  }

  getCompanyContracts(): Observable<Contract[]> {
    return this.http.get<Contract[]>(`${this.apiUrl}/company`);
  }

  getContractById(id: string): Observable<Contract> {
    return this.http.get<Contract>(`${this.apiUrl}/${id}`);
  }

  signContract(id: string, signatureBase64: string): Observable<Contract> {
    return this.http.post<Contract>(`${this.apiUrl}/${id}/sign`, { signatureBase64 });
  }

  signContractAsCompany(id: string, signatureBase64: string): Observable<Contract> {
    return this.http.post<Contract>(`${this.apiUrl}/${id}/sign-company`, { signatureBase64 });
  }

  rejectContract(id: string, reason: string): Observable<Contract> {
    return this.http.post<Contract>(`${this.apiUrl}/${id}/reject`, { reason });
  }

  deleteContract(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  getFileUrl(relativePath: string | null | undefined): string {
    if (!relativePath) return '';
    const baseUrl = environment.apiUrl.replace(/\/api$/, '');
    return baseUrl + relativePath;
  }
}
