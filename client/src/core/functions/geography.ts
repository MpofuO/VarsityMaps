import { GeoPolygon } from '../../types/geography';

export function toGeoPolygon(path: google.maps.LatLngLiteral[]): GeoPolygon {
  const ring = path.map((point): [number, number] => [point.lng, point.lat]);
  ring.push(ring[0]);
  return { type: 'Polygon', coordinates: [ring] };
}

export function fromGeoPolygon(polygon: GeoPolygon): google.maps.LatLngLiteral[] {
  const ring = polygon.coordinates[0];
  return ring.slice(0, -1).map(([lng, lat]) => ({ lat, lng }));
}

export function isPointInPolygon(point: google.maps.LatLngLiteral, ring: [number, number][]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const intersects = yi > point.lat !== yj > point.lat &&
      point.lng < ((xj - xi) * (point.lat - yi)) / (yj - yi) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}