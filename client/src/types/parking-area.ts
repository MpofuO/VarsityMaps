import { GeoPolygon } from './geography';

export interface ParkingArea {
  parkingAreaId: number;
  name: string;
  isAccessible: boolean;
  isGuestAccessible: boolean;
  boundary: GeoPolygon;
  accessNodeIds: number[];
}

export interface ParkingAreaModel {
  name: string;
  isAccessible: boolean;
  isGuestAccessible: boolean;
  boundary: GeoPolygon;
}

export interface ParkingAreaOption {
  parkingAreaId: number;
  name: string;
  boundary: GeoPolygon;
  accessNodeIds: number[];
}

export interface OriginParkingRequired {
  code: 'ORIGIN_PARKING_REQUIRED';
  message: string;
  parkingAreas: ParkingAreaOption[];
}
