import { GeoPoint } from './geography';

export interface Node {
    nodeId: number;
    name: string | null;
    interestOfEntrance: string | null;
    location: GeoPoint;
    buildingId: number | null;
    parkingAreaId: number | null;
}