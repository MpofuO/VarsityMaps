import { GeoLineString } from './geography';

export interface RouteResult {
  routeId: number;
  path: GeoLineString;
  distanceMeters: number;
  estimatedTravelTimeMinutes: number;
  fromBuildingId: number;
  toBuildingId: number;
  travelMode: number;
}