import { GeoPolygon } from './geography';

export interface Building {
  buildingId: number;
  name: string;
  alias: string;
  isAccessible: boolean;
  isGuestAccessible: boolean;
  allowsPassage: boolean;
  boundary: GeoPolygon;
}

export interface BuildingModel {
  name: string;
  alias: string;
  isAccessible: boolean;
  isGuestAccessible: boolean;
  allowsPassage: boolean;
  boundary: GeoPolygon;
}