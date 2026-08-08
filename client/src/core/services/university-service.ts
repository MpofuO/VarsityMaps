import { Injectable } from '@angular/core';
import { BaseService } from './base-service';
import { University } from '../../types/university';
import { Campus } from '../../types/campus';
import { Application } from '../../types/application';

@Injectable({
  providedIn: 'root',
})
export class UniversityService extends BaseService {
  constructor() {
    super();
  }

  getUniversities() {
    return this.http.get<University[]>(`${this.apiUrl}/university`);
  }

  getCampuses(universityId: number) {
    return this.http.get<Campus[]>(`${this.apiUrl}/university/${universityId}/campuses`);
  }

  getApplications() {
    return this.http.get<Application[]>(`${this.apiUrl}/university/applications`);
  }

  adjudicate(id: number, isApproved: boolean, reason: string | null = null) {
    return this.http.put<void>(
      `${this.apiUrl}/university/applications/${id}?isApproved=${isApproved}`,
      JSON.stringify(reason),
      { headers: { 'Content-Type': 'application/json' } }
    );
  }
}
