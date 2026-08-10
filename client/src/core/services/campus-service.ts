import { Injectable } from '@angular/core';
import { BaseService } from './base-service';
import { Campus } from '../../types/campus';
import { GeoPoint } from '../../types/geography';

export interface CampusModel {
  name: string;
  alias: string;
  center: GeoPoint;
}

@Injectable({ providedIn: 'root' })
export class CampusService extends BaseService {
  getCampuses() {
    return this.http.get<Campus[]>(`${this.apiUrl}/campus`);
  }

  createCampus(model: CampusModel) {
    return this.http.post<Campus>(`${this.apiUrl}/campus`, model);
  }

  updateCampus(id: number, model: CampusModel) {
    return this.http.put<Campus>(`${this.apiUrl}/campus/${id}`, model);
  }
}