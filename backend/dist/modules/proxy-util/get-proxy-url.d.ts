export type ProxyTarget = "telegram" | "payments";
/**
 * Возвращает proxy URL для указанного целевого сервиса, если прокси включен
 * для этого сервиса. Возвращает null, если прокси не настроен или отключён.
 */
export declare function getProxyUrl(target: ProxyTarget): Promise<string | null>;
//# sourceMappingURL=get-proxy-url.d.ts.map