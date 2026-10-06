import { Injectable } from '@angular/core';
import { BaseService } from './base-service';
import { LiveRouteResult, RouteResult } from '../../types/route-result';
import { RouteGuide } from '../../types/route-guide';

@Injectable({ providedIn: 'root' })
export class NavigationService extends BaseService {

  getRoute(
    fromBuildingId: number,
    toBuildingId: number,
    mode: number = 1,
    originParkingAreaId: number | null = null,
    destinationInterest: string | null = null
  ) {
    const params = new URLSearchParams({
      fromBuildingId: String(fromBuildingId),
      toBuildingId: String(toBuildingId),
      mode: String(mode)
    });
    if (originParkingAreaId !== null) params.set('originParkingAreaId', String(originParkingAreaId));
    if (destinationInterest !== null) params.set('destinationInterest', destinationInterest);

    return this.http.get<RouteResult[] | RouteResult>(
      `${this.apiUrl}/navigation/route?${params.toString()}`
    );
  }

  getLiveRoute(
    latitude: number,
    longitude: number,
    toBuildingId: number,
    mode: number,
    destinationInterest: string | null = null,
    isWalkingLeg: boolean | null = null,
    destinationParkingAreaId: number | null = null
  ) {
    const body: {
      location: { type: string; coordinates: number[] };
      toBuildingId: number;
      mode: number;
      destinationInterest: string | null;
      isWalkingLeg?: boolean;
      destinationParkingAreaId?: number;
    } = {
      location: {
        type: 'Point',
        coordinates: [longitude, latitude]
      },
      toBuildingId,
      mode,
      destinationInterest
    };
    if (isWalkingLeg !== null) body.isWalkingLeg = isWalkingLeg;
    if (destinationParkingAreaId !== null) body.destinationParkingAreaId = destinationParkingAreaId;

    return this.http.post<LiveRouteResult>(`${this.apiUrl}/navigation/live-route`, body);
  }

  getRouteGuides(routeId: number) {
    return this.http.get<RouteGuide[]>(
      `${this.apiUrl}/navigation/route-guides/${routeId}`
    );
  }
}