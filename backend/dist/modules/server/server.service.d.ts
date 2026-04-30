/**
 * Мониторинг хоста (CPU, RAM, Disk, Uptime, Load) и управление SSH.
 * Контейнер API монтирует:
 *   - /proc:/host-proc:ro   — метрики хоста
 *   - /etc/ssh:/host-etc/ssh — конфиг SSH хоста
 * + pid: host               — для nsenter (reload sshd)
 */
export interface ServerStats {
    hostname: string;
    platform: string;
    arch: string;
    uptimeSeconds: number;
    loadAvg: [number, number, number];
    cpu: {
        model: string;
        cores: number;
        usagePercent: number;
    };
    memory: {
        totalBytes: number;
        usedBytes: number;
        freeBytes: number;
        usagePercent: number;
    };
    disk: {
        totalBytes: number;
        usedBytes: number;
        freeBytes: number;
        usagePercent: number;
        mount: string;
    } | null;
}
export declare function getServerStats(): Promise<ServerStats>;
export interface SshConfig {
    port: number;
    permitRootLogin: string;
    passwordAuthentication: boolean;
    pubkeyAuthentication: boolean;
}
export declare function getSshConfig(): Promise<SshConfig | null>;
export declare function updateSshConfig(updates: Partial<SshConfig>): Promise<{
    ok: boolean;
    error?: string;
}>;
//# sourceMappingURL=server.service.d.ts.map