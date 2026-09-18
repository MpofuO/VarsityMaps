import { Injectable } from '@angular/core';
import { BaseService } from './base-service';
import { RouteResult } from '../../types/route-result';

@Injectable({ providedIn: 'root' })
export class NavigationService extends BaseService {

  getRoute(fromBuildingId: number, toBuildingId: number, mode: number = 1) {
    return this.http.get<RouteResult>(
      `${this.apiUrl}/navigation/route?fromBuildingId=${fromBuildingId}&toBuildingId=${toBuildingId}&mode=${mode}`
    );
  }
}