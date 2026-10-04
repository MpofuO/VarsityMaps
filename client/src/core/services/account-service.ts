import { inject, Injectable, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { catchError, tap, throwError } from 'rxjs';
import { LoginModel, RegisterInstitutionModel, RegisterModel, AcceptInvitationModel, EmailCheckResult } from '../../types/auth';
import { User } from '../../types/user';
import { environment } from '../../environments/environment';
import { BaseService } from './base-service';
import { University } from '../../types/university';
import { Building } from '../../types/building';

export const SystemAdminRole = 'SystemAdmin';
export const UniversityAdminRole = 'UniversityAdmin';
export const CampusAdminRole = 'CampusAdmin';
export const StandardUserRole = 'StandardUser';

export type Role = typeof SystemAdminRole | typeof UniversityAdminRole | typeof CampusAdminRole | typeof StandardUserRole;

@Injectable({ providedIn: 'root' })
export class AccountService extends BaseService {
  private readonly storageKey = 'varsitymaps-user';
  private readonly recentSearchesKey = 'varsitymaps-recent-searches';
  private refreshTimer: ReturnType<typeof setTimeout> | null = null;

  readonly currentUser = signal<User | null>(null);
  readonly recentSearches = signal<Building[]>([]);

  constructor() {
    super();
    this.loadFromStorage();
  }

  login(model: LoginModel) {
    return this.http.post<User>(`${this.apiUrl}/account/login`, model, { withCredentials: true }).pipe(
      tap(user => {
        if (user) {
          this.setAuthenticatedUser(user);
        }
      }),
      catchError((error: HttpErrorResponse) => throwError(() => error))
    );
  }

  registerStandardUser(model: RegisterModel) {
    return this.http.post<User>(`${this.apiUrl}/account/register`, model, { withCredentials: true }).pipe(
      tap((user) => this.setAuthenticatedUser(user)),
      catchError((error: HttpErrorResponse) => throwError(() => error))
    );
  }

  registerInstitution(model: RegisterInstitutionModel) {
    return this.http.post<User>(`${this.apiUrl}/university/applications`, model).pipe(
      tap((response) => {
        this.clearUser();
        return response;
      }),
      catchError((error: HttpErrorResponse) => throwError(() => error))
    );
  }

  emailExists(email: string) {
    return this.http.get<EmailCheckResult>(`${this.apiUrl}/account/email-exists?email=${encodeURIComponent(email)}`);
  }

  acceptInvitation(invitationId: number, model: AcceptInvitationModel) {
    return this.http.post<User>(`${this.apiUrl}/account/accept-invitation/${invitationId}`, model, { withCredentials: true }).pipe(
      tap((user) => this.setAuthenticatedUser(user)),
      catchError((error: HttpErrorResponse) => throwError(() => error))
    );
  }

  switchCampus(campusId: number) {
    return this.http.post<User>(`${this.apiUrl}/account/switch-campus`, campusId).pipe(
      tap((user) => this.setAuthenticatedUser(user)),
      catchError((error: HttpErrorResponse) => throwError(() => error))
    );
  }

  switchInstitution(universityId: number) {
    return this.http.post<User>(`${this.apiUrl}/account/switch-institution`, universityId).pipe(
      tap((user) => this.setAuthenticatedUser(user)),
      catchError((error: HttpErrorResponse) => throwError(() => error))
    );
  }

  getMyUniversity() {
    return this.http.get<University>(`${this.apiUrl}/account/my-university`);
  }

  refreshToken() {
    return this.http.post<User | null>(`${this.apiUrl}/account/refresh-token`, {}, { withCredentials: true }).pipe(
      tap(user => user ? this.setAuthenticatedUser(user) : this.clearUser()),
      catchError(error => {
        this.clearUser();
        return throwError(() => error);
      })
    );
  }

  logout(): void {
    this.clearUser();
    this.http.post<void>(`${this.apiUrl}/account/logout`, {}, { withCredentials: true })
      .subscribe({ error: () => this.clearUser() });
  }

  addRecentSearch(building: Building): void {
    const user = this.currentUser();
    if (!user || !user.campusId) return;

    const campusId = user.campusId;
    const map = this.getRecentSearchesMap();
    const currentList = map[campusId] || [];

    const filtered = currentList.filter(b => b.buildingId !== building.buildingId);
    const updated = [building, ...filtered].slice(0, 5);

    map[campusId] = updated;
    window.localStorage.setItem(this.recentSearchesKey, JSON.stringify(map));

    this.recentSearches.set(updated);
  }

  private setAuthenticatedUser(user: User): User {
    const authenticatedUser: User = {
      ...user,
      roles: user.roles?.length ? user.roles : this.extractRoles(user)
    };

    this.currentUser.set(authenticatedUser);
    window.localStorage.setItem(this.storageKey, JSON.stringify(authenticatedUser));
    this.scheduleTokenRefresh(authenticatedUser.token);

    this.syncRecentSearchesForCampus(user.campusId);

    return authenticatedUser;
  }

  private clearUser(): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
    this.currentUser.set(null);
    this.recentSearches.set([]);
    window.localStorage.removeItem(this.storageKey);
  }

  private scheduleTokenRefresh(token: string): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
    }

    const expiresAt = Number(this.decodeTokenPayload(token)?.['exp']) * 1000;
    if (!Number.isFinite(expiresAt)) {
      this.clearUser();
      return;
    }

    const refreshIn = Math.max(expiresAt - Date.now() - 60_000, 0);
    this.refreshTimer = setTimeout(() => {
      this.refreshToken().subscribe({ error: () => this.clearUser() });
    }, refreshIn);
  }

  private loadFromStorage(): void {
    const stored = window.localStorage.getItem(this.storageKey);
    if (!stored) return;

    try {
      const parsed = JSON.parse(stored) as User;
      if (parsed?.token) {
        this.currentUser.set(parsed);
        this.syncRecentSearchesForCampus(parsed.campusId);
      }
    } catch {
      this.clearUser();
    }
  }

  private syncRecentSearchesForCampus(campusId: number | null): void {
    if (!campusId) {
      this.recentSearches.set([]);
      return;
    }
    const map = this.getRecentSearchesMap();
    this.recentSearches.set(map[campusId] || []);
  }

  private getRecentSearchesMap(): Record<number, Building[]> {
    try {
      const stored = window.localStorage.getItem(this.recentSearchesKey);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  }

  private extractRoles(user: User): string[] {
    const token = user.token;
    if (!token) return [];

    const model = this.decodeTokenPayload(token);
    const roles = model?.['role'] ?? model?.['roles'] ?? [];
    if (Array.isArray(roles)) {
      return roles.filter((role): role is string => typeof role === 'string');
    }
    return typeof roles === 'string' ? [roles] : [];
  }

  private decodeTokenPayload(token: string): Record<string, unknown> | null {
    try {
      const encodedPayload = token.split('.')[1]
        .replace(/-/g, '+')
        .replace(/_/g, '/');
      const paddedPayload = encodedPayload.padEnd(Math.ceil(encodedPayload.length / 4) * 4, '=');
      return JSON.parse(atob(paddedPayload)) as Record<string, unknown>;
    } catch {
      return null;
    }
  }
}