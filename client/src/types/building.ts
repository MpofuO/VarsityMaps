import { GeoPolygon } from './geography';

export interface Building {
  buildingId: number;
  name: string;
  alias: string;
  isAccessible: boolean;
  isGuestAccessible: boolean;
  boundary: GeoPolygon;
}

export interface BuildingModel {
  name: string;
  alias: string;
  isAccessible: boolean;
  isGuestAccessible: boolean;
  boundary: GeoPolygon;
}