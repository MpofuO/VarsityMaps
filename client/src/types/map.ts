export interface MapPolygon {
  id: string;
  paths: google.maps.LatLngLiteral[];
  selected?: boolean;
  strokeColor?: string;
  fillColor?: string;
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