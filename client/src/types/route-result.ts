import { GeoLineString, GeoPoint } from './geography';

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
}