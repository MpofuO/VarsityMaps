import { Injectable } from '@angular/core';
import { BaseService } from './base-service';
import { RouteResult } from '../../types/route-result';
import { RouteGuide } from '../../types/route-guide';

@Injectable({ providedIn: 'root' })
export class NavigationService extends BaseService {

  getRoute(fromBuildingId: number, toBuildingId: number, mode: number = 1, originParkingAreaId: number | null = null) {
    const parkingQuery = originParkingAreaId === null ? '' : `&originParkingAreaId=${originParkingAreaId}`;
    return this.http.get<RouteResult[] | RouteResult>(
      `${this.apiUrl}/navigation/route?fromBuildingId=${fromBuildingId}&toBuildingId=${toBuildingId}&mode=${mode}${parkingQuery}`
    );
  }

  getRouteGuides(routeId: number) {
    return this.http.get<RouteGuide[]>(
      `${this.apiUrl}/navigation/route-guides/${routeId}`
    );
  }
}