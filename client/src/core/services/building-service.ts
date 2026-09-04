import { Injectable } from '@angular/core';
import { BaseService } from './base-service';
import { Building, BuildingModel } from '../../types/building';


@Injectable({ providedIn: 'root' })
export class BuildingService extends BaseService {
  getBuildings() {
    return this.http.get<Building[]>(`${this.apiUrl}/building`);
  }

  createBuilding(model: BuildingModel) {
    return this.http.post<Building>(`${this.apiUrl}/building`, model);
  }

  updateBuilding(id: number, model: BuildingModel) {
    return this.http.put<Building>(`${this.apiUrl}/building/${id}`, model);
  }

  deleteBuilding(id: number) {
    return this.http.delete<void>(`${this.apiUrl}/building/${id}`);
  }
}