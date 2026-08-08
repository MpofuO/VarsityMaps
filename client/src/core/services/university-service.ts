import { Injectable } from '@angular/core';
import { BaseService } from './base-service';
import { University } from '../../types/university';
import { Campus } from '../../types/campus';

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
}
