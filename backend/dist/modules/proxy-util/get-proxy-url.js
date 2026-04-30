import { getSystemConfig } from "../client/client.service.js";
/**
 * Возвращает proxy URL для указанного целевого сервиса, если прокси включен
 * для этого сервиса. Возвращает null, если прокси не настроен или отключён.
 */
export async function getProxyUrl(target) {
    const config = await getSystemConfig();
    const proxyUrl = config.proxyUrl?.trim();
    if (!proxyUrl)
        return null;
    const enabled = config.proxyEnabled === true || config.proxyEnabled === "true";
    if (!enabled)
        return null;
    if (target === "telegram") {
        const tgEnabled = config.proxyTelegram === true || config.proxyTelegram === "true";
        return tgEnabled ? proxyUrl : null;
    }
    if (target === "payments") {
        const payEnabled = config.proxyPayments === true || config.proxyPayments === "true";
        return payEnabled ? proxyUrl : null;
    }
    return null;
}
//# sourceMappingURL=get-proxy-url.js.map