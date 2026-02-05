import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  AuthResponse,
  LoginRequest,
  RegisterFreelancerRequest,
  RegisterCompanyRequest,
  RegisterAdminRequest,
  OAuthGoogleRequest,
  OAuthLinkedInRequest,
  OAuthCompleteRequest,
  Role,
} from '../models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly apiUrl = `${environment.apiUrl}/auth`;

  private currentUserSignal = signal<AuthResponse | null>(this.loadUserFromStorage());

  currentUser = this.currentUserSignal.asReadonly();
  isAuthenticated = computed(() => !!this.currentUserSignal());
  userRole = computed(() => this.currentUserSignal()?.role as Role | null);

  constructor(
    private http: HttpClient,
    private router: Router,
  ) {}

  // ── Auth API calls ──

  login(request: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/login`, request).pipe(
      tap((response) => this.handleAuthSuccess(response)),
    );
  }

  registerFreelancer(request: RegisterFreelancerRequest): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${this.apiUrl}/register/freelancer`, request)
      .pipe(tap((response) => this.handleAuthSuccess(response)));
  }

  registerCompany(request: RegisterCompanyRequest): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${this.apiUrl}/register/company`, request)
      .pipe(tap((response) => this.handleAuthSuccess(response)));
  }

  registerAdmin(request: RegisterAdminRequest): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${this.apiUrl}/register/admin`, request)
      .pipe(tap((response) => this.handleAuthSuccess(response)));
  }

  // ── Email Verification ──

  sendVerificationCode(email: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/email/send-code`, { email });
  }

  verifyCode(email: string, code: string): Observable<{ verified: boolean }> {
    return this.http.post<{ verified: boolean }>(`${this.apiUrl}/email/verify-code`, { email, code });
  }

  // ── Password Reset ──

  resetPassword(email: string, code: string, newPassword: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/reset-password`, { email, code, newPassword });
  }

  // ── OAuth API calls ──

  googleLogin(request: OAuthGoogleRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/oauth/google`, request);
  }

  linkedInLogin(request: OAuthLinkedInRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/oauth/linkedin`, request);
  }

  oauthCompleteRegistration(request: OAuthCompleteRequest): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${this.apiUrl}/oauth/complete-registration`, request)
      .pipe(tap((response) => this.handleAuthSuccess(response)));
  }

  logout(): void {
    localStorage.removeItem('auth');
    this.currentUserSignal.set(null);
    this.router.navigate(['/auth/login']);
  }

  getToken(): string | null {
    return this.currentUserSignal()?.token ?? null;
  }

  // ── Public helper to set auth state ──

  setAuthenticated(response: AuthResponse): void {
    this.handleAuthSuccess(response);
  }

  // ── Private helpers ──

  private handleAuthSuccess(response: AuthResponse): void {
    localStorage.setItem('auth', JSON.stringify(response));
    this.currentUserSignal.set(response);
  }

  private loadUserFromStorage(): AuthResponse | null {
    const data = localStorage.getItem('auth');
    if (!data) return null;
    try {
      return JSON.parse(data) as AuthResponse;
    } catch {
      return null;
    }
  }
}
