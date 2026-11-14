export type LatLng = { lat: number; lng: number };
export type Place = LatLng & { radiusM: number };

const EARTH_RADIUS_M = 6_371_000;

export function distanceM(a: LatLng, b: LatLng): number {
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function isInside(pos: LatLng, place: Place): boolean {
  return distanceM(pos, place) <= place.radiusM;
}
