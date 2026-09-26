import { Injectable } from '@angular/core';
import { BaseService } from './base-service';
import { ParkingArea, ParkingAreaModel } from '../../types/parking-area';

@Injectable({ providedIn: 'root' })
export class ParkingAreaService extends BaseService {
  getParkingAreas() {
    return this.http.get<ParkingArea[]>(`${this.apiUrl}/parkingarea`);
  }

  addParkingArea(model: ParkingAreaModel) {
    return this.http.post<ParkingArea>(`${this.apiUrl}/parkingarea`, model);
  }

  updateParkingArea(id: number, model: ParkingAreaModel) {
    return this.http.put<ParkingArea>(`${this.apiUrl}/parkingarea/${id}`, model);
  }

  deleteParkingArea(id: number) {
    return this.http.delete<void>(`${this.apiUrl}/parkingarea/${id}`);
  }
}
