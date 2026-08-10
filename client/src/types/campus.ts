import { GeoPoint } from "./geography";

export interface Campus {
    campusId: number;
    name: string;
    alias: string;
    center: GeoPoint
    universityId: number;
}
