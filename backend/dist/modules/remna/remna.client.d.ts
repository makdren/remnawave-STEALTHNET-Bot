/**
 * Клиент Remna (RemnaWave) API — по спецификации api-1.yaml
 * Все запросы с Bearer ADMIN_TOKEN.
 */
export declare function isRemnaConfigured(): boolean;
export declare function remnaFetch<T>(path: string, options?: RequestInit): Promise<{
    data?: T;
    error?: string;
    status: number;
}>;
/** GET /api/users — пагинация Remna: size и start (offset) */
export declare function remnaGetUsers(params?: {
    page?: number;
    limit?: number;
    start?: number;
    size?: number;
}): Promise<{
    data?: unknown;
    error?: string;
    status: number;
}>;
/** GET /api/users/{uuid} */
export declare function remnaGetUser(uuid: string): Promise<{
    data?: unknown;
    error?: string;
    status: number;
}>;
/** DELETE /api/users/{uuid} — удалить пользователя из Remna */
export declare function remnaDeleteUser(uuid: string): Promise<{
    data?: unknown;
    error?: string;
    status: number;
}>;
/** GET /api/users/by-username/{username} */
export declare function remnaGetUserByUsername(username: string): Promise<{
    data?: unknown;
    error?: string;
    status: number;
}>;
/** GET /api/users/by-email/{email} — может вернуть массив или объект с users */
export declare function remnaGetUserByEmail(email: string): Promise<{
    data?: unknown;
    error?: string;
    status: number;
}>;
/** GET /api/users/by-telegram-id/{telegramId} */
export declare function remnaGetUserByTelegramId(telegramId: string): Promise<{
    data?: unknown;
    error?: string;
    status: number;
}>;
/** Извлечь UUID из ответа Remna (create/get: объект, response, data, users[0]). */
export declare function extractRemnaUuid(d: unknown): string | null;
/**
 * Формирует username для Remna (3–36 символов, только [a-zA-Z0-9_-]).
 * Приоритет: Telegram username → Telegram ID (tg123) → email (local part) → fallback.
 */
export declare function remnaUsernameFromClient(opts: {
    telegramUsername?: string | null;
    telegramId?: string | null;
    email?: string | null;
    clientIdFallback?: string;
}): string;
/** POST /api/users */
export declare function remnaCreateUser(body: Record<string, unknown>): Promise<{
    data?: unknown;
    error?: string;
    status: number;
}>;
/** PATCH /api/users */
export declare function remnaUpdateUser(body: Record<string, unknown>): Promise<{
    data?: unknown;
    error?: string;
    status: number;
}>;
/** GET /api/subscriptions */
export declare function remnaGetSubscriptions(params?: {
    page?: number;
    limit?: number;
}): Promise<{
    data?: unknown;
    error?: string;
    status: number;
}>;
/** GET /api/subscription-templates */
export declare function remnaGetSubscriptionTemplates(): Promise<{
    data?: unknown;
    error?: string;
    status: number;
}>;
/** GET /api/internal-squads, /api/external-squads */
export declare function remnaGetInternalSquads(): Promise<{
    data?: unknown;
    error?: string;
    status: number;
}>;
export declare function remnaGetExternalSquads(): Promise<{
    data?: unknown;
    error?: string;
    status: number;
}>;
/** GET /api/system/stats */
export declare function remnaGetSystemStats(): Promise<{
    data?: unknown;
    error?: string;
    status: number;
}>;
/** GET /api/system/stats/nodes — статистика нод по дням */
export declare function remnaGetSystemStatsNodes(): Promise<{
    data?: unknown;
    error?: string;
    status: number;
}>;
/** GET /api/nodes — список нод (uuid, name, address, isConnected, isDisabled, isConnecting, ...) */
export declare function remnaGetNodes(): Promise<{
    data?: unknown;
    error?: string;
    status: number;
}>;
/** POST /api/nodes/{uuid}/actions/enable */
export declare function remnaEnableNode(uuid: string): Promise<{
    data?: unknown;
    error?: string;
    status: number;
}>;
/** POST /api/nodes/{uuid}/actions/disable */
export declare function remnaDisableNode(uuid: string): Promise<{
    data?: unknown;
    error?: string;
    status: number;
}>;
/** POST /api/nodes/{uuid}/actions/restart */
export declare function remnaRestartNode(uuid: string): Promise<{
    data?: unknown;
    error?: string;
    status: number;
}>;
/** POST /api/users/{uuid}/actions/revoke — отозвать подписку */
export declare function remnaRevokeUserSubscription(uuid: string, body?: {
    expirationDate?: string;
}): Promise<{
    data?: unknown;
    error?: string;
    status: number;
}>;
/** POST /api/users/{uuid}/actions/disable */
export declare function remnaDisableUser(uuid: string): Promise<{
    data?: unknown;
    error?: string;
    status: number;
}>;
/** POST /api/users/{uuid}/actions/enable */
export declare function remnaEnableUser(uuid: string): Promise<{
    data?: unknown;
    error?: string;
    status: number;
}>;
/** POST /api/users/{uuid}/actions/reset-traffic */
export declare function remnaResetUserTraffic(uuid: string): Promise<{
    data?: unknown;
    error?: string;
    status: number;
}>;
/** GET /api/hwid/devices/{userUuid} — список устройств пользователя (Remna HWID) */
export declare function remnaGetUserHwidDevices(userUuid: string): Promise<{
    data?: unknown;
    error?: string;
    status: number;
}>;
/** POST /api/hwid/devices/delete — удалить устройство пользователя (Remna HWID) */
export declare function remnaDeleteUserHwidDevice(userUuid: string, hwid: string): Promise<{
    data?: unknown;
    error?: string;
    status: number;
}>;
/** POST /api/users/bulk/update-squads — массово выставляет один и тот же список сквадов многим пользователям (uuids[]). Не использовать для одного — нет мержа с доп. сквадами. */
export declare function remnaBulkUpdateUsersSquads(body: {
    uuids: string[];
    activeInternalSquads: string[];
}): Promise<{
    data?: unknown;
    error?: string;
    status: number;
}>;
/** POST /api/internal-squads/{uuid}/bulk-actions/add-users — в Remna добавляет ВСЕХ пользователей в сквад (summary в api-1.yaml). Не вызывать для назначения сквада одному пользователю — только remnaUpdateUser(activeInternalSquads). */
export declare function remnaAddUsersToInternalSquad(squadUuid: string, body: {
    userUuids: string[];
}): Promise<{
    data?: unknown;
    error?: string;
    status: number;
}>;
/**
 * DELETE /api/internal-squads/{squadUuid}/bulk-actions/remove-users
 * Массовое действие в Remna: убирает из сквада ВСЕХ пользователей (тело запроса не принимается).
 * Чтобы убрать сквад только у одного пользователя — remnaUpdateUser(uuid, { activeInternalSquads: [...] }) без этого сквада.
 */
export declare function remnaRemoveAllUsersFromInternalSquad(squadUuid: string): Promise<{
    data?: unknown;
    error?: string;
    status: number;
}>;
/** GET /api/bandwidth-stats/users/{uuid} — user usage by date range */
export declare function remnaGetUserBandwidthStats(userUuid: string, start: string, end: string): Promise<{
    data?: {
        response: {
            categories: string[];
            series: {
                name: string;
                data: number[];
            }[];
            sparklineData: number[];
        };
    } | undefined;
    error?: string;
    status: number;
}>;
/** GET /api/bandwidth-stats/nodes/{uuid}/users — top users usage on node by range */
export declare function remnaGetNodeUsersUsage(nodeUuid: string, start: string, end: string, topUsersLimit?: number): Promise<{
    data?: {
        response: {
            categories: string[];
            sparklineData: number[];
            topUsers: {
                color: string;
                username: string;
                total: number;
            }[];
        };
    } | undefined;
    error?: string;
    status: number;
}>;
/** GET /api/bandwidth-stats/nodes/realtime — realtime usage per node (removed in API 2.7.2, kept for compat) */
export declare function remnaGetNodesRealtimeUsage(): Promise<{
    data?: {
        response: {
            nodeUuid: string;
            nodeName: string;
            countryCode: string;
            downloadBytes: number;
            uploadBytes: number;
            totalBytes: number;
            downloadSpeedBps: number;
            uploadSpeedBps: number;
            totalSpeedBps: number;
        }[];
    } | undefined;
    error?: string;
    status: number;
}>;
/** POST /api/ip-control/fetch-users-ips/{nodeUuid} — start async job to fetch user IPs on a node */
export declare function remnaFetchUsersIps(nodeUuid: string): Promise<{
    data?: {
        response: {
            jobId: string;
        };
    } | undefined;
    error?: string;
    status: number;
}>;
/** GET /api/ip-control/fetch-users-ips/result/{jobId} — poll async job result */
export declare function remnaGetFetchUsersIpsResult(jobId: string): Promise<{
    data?: {
        response: {
            isCompleted: boolean;
            isFailed: boolean;
            result: {
                success: boolean;
                nodeUuid: string;
                users: {
                    userId: string;
                    ips: {
                        ip: string;
                        lastSeen: string;
                    }[];
                }[];
            } | null;
        };
    } | undefined;
    error?: string;
    status: number;
}>;
/** GET /api/system/nodes/metrics — Prometheus-style metrics per node */
export declare function remnaGetNodesMetrics(): Promise<{
    data?: {
        response: {
            nodes: {
                nodeUuid: string;
                nodeName: string;
                countryEmoji: string;
                providerName: string;
                usersOnline: number;
                inboundsStats: {
                    tag: string;
                    upload: string;
                    download: string;
                }[];
                outboundsStats: {
                    tag: string;
                    upload: string;
                    download: string;
                }[];
            }[];
        };
    } | undefined;
    error?: string;
    status: number;
}>;
/** GET /api/users/{uuid} — resolve user by UUID (returns full user with username, etc.) */
export declare function remnaGetUserByUuid(uuid: string): Promise<{
    data?: {
        response: {
            uuid: string;
            username: string;
            shortUuid: string;
            [key: string]: unknown;
        };
    } | undefined;
    error?: string;
    status: number;
}>;
//# sourceMappingURL=remna.client.d.ts.map