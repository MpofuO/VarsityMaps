import { GeoLineString, GeoPoint } from './geography';
import { RouteGuide } from './route-guide';

export interface RouteResult {
  routeId: number;
  path: GeoLineString;
  distanceMeters: number;
  estimatedTravelTimeMinutes: number;
  fromBuildingId: number;
  toBuildingId: number;
  travelMode: number;
  transitionParkingAreaId: number | null;
  transitionLocation: GeoPoint | null;
  originParkingAreaId: number | null;
  originParkingLocation: GeoPoint | null;
  routeGuides?: RouteGuide[];
  originSnapLocation?: GeoPoint | null;
}

export interface LiveRouteResult {
  route: RouteResult;
  routeGuides: RouteGuide[];
  originSnapLocation: GeoPoint | null;
}