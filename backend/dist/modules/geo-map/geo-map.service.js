/**
 * Geo Map aggregation service.
 * Fetches nodes, user IPs, traffic stats and HWID devices from Remnawave,
 * geolocates everything and returns a unified map response.
 */
import { env } from "../../config/index.js";
import { prisma } from "../../db.js";
import { remnaGetNodes, remnaFetchUsersIps, remnaGetFetchUsersIpsResult, remnaGetNodeUsersUsage, remnaGetUserHwidDevices, remnaGetUserByUuid, } from "../remna/remna.client.js";
import { geolocateIp, geolocateIps } from "./geoip.service.js";
import { LRUCache } from "lru-cache";
let cachedResponse = null;
let cacheTimestamp = 0;
const userNameCache = new LRUCache({ max: 10_000, ttl: 5 * 60 * 1000 });
async function getCacheTtlMs() {
    try {
        const row = await prisma.systemSetting.findUnique({ where: { key: "geo_cache_ttl" } });
        if (row?.value?.trim()) {
            const val = parseInt(row.value.trim(), 10);
            if (val > 0)
                return val * 1000;
        }
    }
    catch { /* fallback */ }
    return (env.GEO_CACHE_TTL ?? 60) * 1000;
}
async function isCacheValid() {
    if (!cachedResponse)
        return false;
    return Date.now() - cacheTimestamp < await getCacheTtlMs();
}
export function invalidateCache() {
    cachedResponse = null;
    cacheTimestamp = 0;
}
async function resolveUsername(userId) {
    const cached = userNameCache.get(userId);
    if (cached)
        return cached;
    try {
        const result = await remnaGetUserByUuid(userId);
        const name = result.data?.response?.username ?? userId.slice(0, 8);
        userNameCache.set(userId, name);
        return name;
    }
    catch {
        return userId.slice(0, 8);
    }
}
async function fetchNodeUserIps(nodeUuid) {
    const jobResult = await remnaFetchUsersIps(nodeUuid);
    if (jobResult.error || !jobResult.data?.response?.jobId)
        return [];
    const jobId = jobResult.data.response.jobId;
    const deadline = Date.now() + 30_000;
    const POLL_INTERVAL = 2000;
    while (Date.now() < deadline) {
        await new Promise((r) => setTimeout(r, POLL_INTERVAL));
        const poll = await remnaGetFetchUsersIpsResult(jobId);
        if (poll.error)
            return [];
        const resp = poll.data?.response;
        if (!resp)
            continue;
        if (resp.isFailed)
            return [];
        if (resp.isCompleted && resp.result) {
            return resp.result.users ?? [];
        }
    }
    return [];
}
async function fetchDeviceInfo(userId) {
    try {
        const result = await remnaGetUserHwidDevices(userId);
        const devices = result.data
            ?.response?.devices;
        if (devices && devices.length > 0) {
            const d = devices[0];
            return {
                platform: d.platform ?? "unknown",
                osVersion: d.osVersion ?? "",
                deviceModel: d.deviceModel ?? "",
            };
        }
    }
    catch { /* ignore */ }
    return null;
}
export async function getGeoMapData(forceRefresh = false) {
    if (!forceRefresh && (await isCacheValid()) && cachedResponse) {
        return cachedResponse;
    }
    const nodesResult = await remnaGetNodes();
    const allNodes = (nodesResult.data?.response ?? []);
    const nodeAddresses = allNodes.map((n) => n.address).filter(Boolean);
    const nodeGeoMap = await geolocateIps(nodeAddresses);
    const mapNodes = [];
    for (const node of allNodes) {
        const geo = nodeGeoMap.get(node.address) ?? await geolocateIp(node.address);
        if (!geo)
            continue;
        mapNodes.push({
            uuid: node.uuid,
            name: node.name,
            countryCode: node.countryCode,
            lat: geo.lat,
            lng: geo.lng,
            isConnected: node.isConnected,
            usersOnline: node.usersOnline ?? 0,
            rxBytesPerSec: node.system?.stats?.interface?.rxBytesPerSec ?? 0,
            txBytesPerSec: node.system?.stats?.interface?.txBytesPerSec ?? 0,
            trafficUsedBytes: node.trafficUsedBytes ?? 0,
            trafficLimitBytes: node.trafficLimitBytes ?? null,
        });
    }
    const connections = [];
    const onlineNodes = allNodes.filter((n) => n.isConnected);
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const startDate = thirtyDaysAgo.toISOString().split("T")[0];
    const endDate = today.toISOString().split("T")[0];
    const ipJobPromises = onlineNodes.map((n) => fetchNodeUserIps(n.uuid).then((users) => ({ nodeUuid: n.uuid, users })));
    const ipResults = await Promise.allSettled(ipJobPromises);
    const trafficByNodeUser = new Map();
    for (const node of onlineNodes) {
        try {
            const usage = await remnaGetNodeUsersUsage(node.uuid, startDate, endDate, 100);
            if (usage.data?.response?.topUsers) {
                for (const u of usage.data.response.topUsers) {
                    trafficByNodeUser.set(`${node.uuid}:${u.username}`, u.total);
                }
            }
        }
        catch { /* ignore */ }
    }
    const allUserIps = [];
    const userIpData = [];
    for (const r of ipResults) {
        if (r.status !== "fulfilled")
            continue;
        for (const user of r.value.users) {
            for (const ipEntry of user.ips) {
                allUserIps.push(ipEntry.ip);
                userIpData.push({
                    nodeUuid: r.value.nodeUuid,
                    userId: user.userId,
                    ip: ipEntry.ip,
                    lastSeen: ipEntry.lastSeen,
                });
            }
        }
    }
    const userGeoMap = await geolocateIps([...new Set(allUserIps)]);
    const seenUserNode = new Set();
    const devicePromises = [];
    for (const entry of userIpData) {
        const key = `${entry.nodeUuid}:${entry.userId}`;
        if (seenUserNode.has(key))
            continue;
        seenUserNode.add(key);
        const geo = userGeoMap.get(entry.ip);
        if (!geo)
            continue;
        const conn = {
            userId: entry.userId,
            username: entry.userId.slice(0, 8),
            lat: geo.lat,
            lng: geo.lng,
            ip: entry.ip,
            lastSeen: entry.lastSeen,
            nodeUuid: entry.nodeUuid,
            trafficBytes: 0,
            device: null,
        };
        connections.push(conn);
        devicePromises.push((async () => {
            const [username, device] = await Promise.all([
                resolveUsername(entry.userId),
                fetchDeviceInfo(entry.userId),
            ]);
            conn.username = username;
            conn.device = device;
            const trafficKey = `${entry.nodeUuid}:${username}`;
            conn.trafficBytes = trafficByNodeUser.get(trafficKey) ?? 0;
        })());
    }
    await Promise.allSettled(devicePromises);
    const response = {
        nodes: mapNodes,
        connections,
        updatedAt: new Date().toISOString(),
    };
    cachedResponse = response;
    cacheTimestamp = Date.now();
    return response;
}
//# sourceMappingURL=geo-map.service.js.map