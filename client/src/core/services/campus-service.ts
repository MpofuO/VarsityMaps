import { Injectable } from '@angular/core';
import { BaseService } from './base-service';
import { Campus } from '../../types/campus';
import { GeoPoint } from '../../types/geography';
import { CampusAdminDetails } from '../../types/campus-admin-details';

export interface CampusModel {
  name: string;
  alias: string;
  center: GeoPoint;
}

@Injectable({ providedIn: 'root' })
export class CampusService extends BaseService {
  getCampus(id: number) {
    return this.http.get<Campus>(`${this.apiUrl}/campus/${id}`);
  }

  getCampuses() {
    return this.http.get<Campus[]>(`${this.apiUrl}/campus`);
  }

  createCampus(model: CampusModel) {
    return this.http.post<Campus>(`${this.apiUrl}/campus`, model);
  }

  updateCampus(id: number, model: CampusModel) {
    return this.http.put<Campus>(`${this.apiUrl}/campus/${id}`, model);
  }

  getCampusAdmin(campusId: number) {
    return this.http.get<CampusAdminDetails | null>(`${this.apiUrl}/campus/${campusId}/admin`);
  }

  suspendAdmin(campusId: number, suspend: boolean) {
    return this.http.post<void>(`${this.apiUrl}/campus/${campusId}/admin/suspend`, suspend);
  }

  unassignAdmin(campusId: number) {
    return this.http.post<void>(`${this.apiUrl}/campus/${campusId}/admin/unassign`, {});
  }
}