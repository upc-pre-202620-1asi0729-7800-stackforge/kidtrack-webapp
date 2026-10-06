/**
 * Shared value object representing geographic coordinates.
 */
export class Coordinates {
  constructor(
    public readonly latitude: number = 0,
    public readonly longitude: number = 0,
  ) {}

  isValid(): boolean {
    return (
      Number.isFinite(this.latitude) &&
      Number.isFinite(this.longitude) &&
      this.latitude >= -90 && this.latitude <= 90 &&
      this.longitude >= -180 && this.longitude <= 180
    );
  }

  /** Haversine distance in metres. */
  distanceTo(other: Coordinates): number {
    const R = 6371000;
    const toRad = (d: number) => (d * Math.PI) / 180;
    const dLat = toRad(other.latitude - this.latitude);
    const dLng = toRad(other.longitude - this.longitude);
    const s =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(this.latitude)) * Math.cos(toRad(other.latitude)) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
  }
}
