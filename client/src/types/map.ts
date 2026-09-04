export interface MapPolygon {
  id: number;
  paths: google.maps.LatLngLiteral[];
  selected?: boolean;
}

export interface MapMarker {
  id: number;
  position: google.maps.LatLngLiteral;
  color?: string;
  selected?: boolean;
}

export interface MapPolyline {
  id: number;
  path: google.maps.LatLngLiteral[];
  color?: string;
  selected: boolean;
}