import { inject, Injectable, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { catchError, tap, throwError } from 'rxjs';
import { LoginModel, RegisterInstitutionModel, RegisterModel, AcceptInvitationModel, EmailCheckResult } from '../../types/auth';
import { User } from '../../types/user';
import { environment } from '../../environments/environment';
import { BaseService } from './base-service';
import { University } from '../../types/university';

export const SystemAdminRole = 'SystemAdmin';
export const UniversityAdminRole = 'UniversityAdmin';
export const CampusAdminRole = 'CampusAdmin';
export const StandardUserRole = 'StandardUser';

export type Role = typeof SystemAdminRole | typeof UniversityAdminRole | typeof CampusAdminRole | typeof StandardUserRole;

@Injectable({ providedIn: 'root' })
export class AccountService extends BaseService {
  private readonly storageKey = 'varsitymaps-user';
  readonly currentUser = signal<User | null>(null);

  constructor() {
    super();
    this.loadFromStorage();
  }

  login(model: LoginModel) {
    return this.http.post<User>(`${this.apiUrl}/account/login`, model).pipe(
      tap(user => {
        if (user) {
          this.setAuthenticatedUser(user);
        }
      }),
      catchError((error: HttpErrorResponse) => throwError(() => error))
    );
  }

  registerStandardUser(model: RegisterModel) {
    return this.http.post<User>(`${this.apiUrl}/account/register`, model).pipe(
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
    return this.http.post<User>(`${this.apiUrl}/account/accept-invitation/${invitationId}`, model).pipe(
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

  logout(): void {
    this.clearUser();
  }

  private setAuthenticatedUser(user: User): User {
    const authenticatedUser: User = {
      ...user,
      roles: user.roles?.length ? user.roles : this.extractRoles(user)
    };
    this.currentUser.set(authenticatedUser);
    window.localStorage.setItem(this.storageKey, JSON.stringify(authenticatedUser));
    return authenticatedUser;
  }

  private clearUser(): void {
    this.currentUser.set(null);
    window.localStorage.removeItem(this.storageKey);
  }

  private loadFromStorage(): void {
    const stored = window.localStorage.getItem(this.storageKey);
    if (!stored) {
      return;
    }

    try {
      const parsed = JSON.parse(stored) as User;
      if (parsed?.token) {
        this.currentUser.set(parsed);
      }
    } catch {
      this.clearUser();
    }
  }

  private extractRoles(user: User): string[] {
    const token = user.token;
    if (!token) {
      return [];
    }

    try {
      const model = JSON.parse(atob(token.split('.')[1]));
      const roles = model.role ?? model.roles ?? [];
      return Array.isArray(roles) ? roles : [roles];
    } catch {
      return [];
    }
  }
}