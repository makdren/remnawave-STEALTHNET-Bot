/**
 * GeoIP service — resolves IP addresses to lat/lng coordinates.
 * Primary: MaxMind GeoLite2-City local DB.
 * Fallback: ip-api.com batch API (free, max 100 IPs per request, 15 req/min).
 */
export interface GeoResult {
    lat: number;
    lng: number;
    country?: string;
    city?: string;
}
export declare function resetMaxMindReader(): void;
/** Resolve a single IP to coordinates. */
export declare function geolocateIp(ip: string): Promise<GeoResult | null>;
/** Resolve many IPs at once (uses cache, MaxMind first, then ip-api batch for misses). */
export declare function geolocateIps(ips: string[]): Promise<Map<string, GeoResult>>;
/** Initialize the MaxMind reader eagerly (call on startup). */
export declare function initGeoIp(): Promise<void>;
//# sourceMappingURL=geoip.service.d.ts.map