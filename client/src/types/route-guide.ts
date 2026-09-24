import { GeoPoint } from "./geography";

export interface RouteGuide {
  stepIndex: number;
  location: GeoPoint;
  instruction: string;
}