import { GeoLineString } from './geography';

export interface RouteResult {
  routeId: number;
  path: GeoLineString;
  distanceMeters: number;
  estimatedWalkingTimeMinutes: number;
  fromBuildingId: number;
  toBuildingId: number;
}