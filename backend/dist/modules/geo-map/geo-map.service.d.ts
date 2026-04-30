/**
 * Geo Map aggregation service.
 * Fetches nodes, user IPs, traffic stats and HWID devices from Remnawave,
 * geolocates everything and returns a unified map response.
 */
export interface GeoMapNode {
    uuid: string;
    name: string;
    countryCode: string;
    lat: number;
    lng: number;
    isConnected: boolean;
    usersOnline: number;
    rxBytesPerSec: number;
    txBytesPerSec: number;
    trafficUsedBytes: number;
    trafficLimitBytes: number | null;
}
export interface GeoMapConnection {
    userId: string;
    username: string;
    lat: number;
    lng: number;
    ip: string;
    lastSeen: string;
    nodeUuid: string;
    trafficBytes: number;
    device: {
        platform: string;
        osVersion: string;
        deviceModel: string;
    } | null;
}
export interface GeoMapResponse {
    nodes: GeoMapNode[];
    connections: GeoMapConnection[];
    updatedAt: string;
}
export declare function invalidateCache(): void;
export declare function getGeoMapData(forceRefresh?: boolean): Promise<GeoMapResponse>;
//# sourceMappingURL=geo-map.service.d.ts.map