export interface Edge {
  edgeId: number;
  fromNodeId: number;
  toNodeId: number;
  weight: number;
  name: string | null;
  isClosed: boolean;
  closedUntil: string | null;
  isEffectivelyClosed: boolean;
  travelModes: number;
}

export enum TravelMode {
  Walking = 1,
  Cycling = 2,
  Bus = 4,
  Car = 8
}

export interface EdgePropertiesModel {
  name: string | null;
  isClosed: boolean;
  closedUntil: string | null;
  travelModes: number;
}