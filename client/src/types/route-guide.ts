import { GeoPoint } from './geography';
import { TravelMode } from './edge';

export interface RouteGuide {
  stepIndex: number;
  location: GeoPoint;
  instruction: string;
  travelMode: TravelMode;
  isTransition: boolean;
  parkingAreaId: number | null;
}