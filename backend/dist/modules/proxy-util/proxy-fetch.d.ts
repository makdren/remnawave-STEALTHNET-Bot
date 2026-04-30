/**
 * Обёртка над fetch с поддержкой HTTP(S) и SOCKS5 прокси.
 * Прокси-URL форматы:
 *   http://user:pass@host:port
 *   https://user:pass@host:port
 *   socks5://user:pass@host:port
 *
 * Используется undici ProxyAgent для HTTP(S) и socks-proxy-agent для SOCKS5.
 */
/**
 * fetch через прокси (если proxyUrl задан), иначе — обычный fetch.
 * Поддерживает HTTP(S) и SOCKS5 прокси.
 */
export declare function proxyFetch(url: string | URL, init?: RequestInit & {
    signal?: AbortSignal;
}, proxyUrl?: string | null): Promise<Response>;
//# sourceMappingURL=proxy-fetch.d.ts.map