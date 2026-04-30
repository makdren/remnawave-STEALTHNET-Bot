/**
 * Сервис «Мой Налог» для самозанятых — авторизация, хранение токенов, выпуск чеков.
 * Токены хранятся в SystemSetting; при истечении автоматически обновляются.
 */
import { prisma } from "../../db.js";
import { getSystemConfig } from "../client/client.service.js";
import { nalogAuth, nalogRefreshToken, nalogCreateIncome, nalogReceiptPrintUrl, } from "./nalog.client.js";
async function getSetting(key) {
    const row = await prisma.systemSetting.findUnique({ where: { key } });
    return row?.value?.trim() || null;
}
async function setSetting(key, value) {
    await prisma.systemSetting.upsert({
        where: { key },
        create: { key, value },
        update: { value },
    });
}
async function saveTokens(tokens) {
    await Promise.all([
        setSetting("nalog_access_token", tokens.token),
        setSetting("nalog_refresh_token", tokens.refreshToken),
        setSetting("nalog_token_expire", tokens.tokenExpireIn),
    ]);
}
async function getAccessToken() {
    const config = await getSystemConfig();
    const nalogConfig = config;
    const inn = nalogConfig.nalogInn?.trim();
    const password = nalogConfig.nalogPassword?.trim();
    const deviceId = nalogConfig.nalogDeviceId?.trim() || "stealthnet-bot-nalog";
    if (!inn || !password)
        return null;
    let accessToken = await getSetting("nalog_access_token");
    const refreshTokenVal = await getSetting("nalog_refresh_token");
    const expireStr = await getSetting("nalog_token_expire");
    const isExpired = !accessToken || !expireStr || new Date(expireStr).getTime() <= Date.now();
    if (isExpired && refreshTokenVal) {
        try {
            const tokens = await nalogRefreshToken(refreshTokenVal, deviceId);
            await saveTokens(tokens);
            accessToken = tokens.token;
        }
        catch (e) {
            console.warn("[Nalog] Refresh token failed, re-authenticating:", e);
            accessToken = null;
        }
    }
    if (!accessToken) {
        try {
            const tokens = await nalogAuth(inn, password, deviceId);
            await saveTokens(tokens);
            accessToken = tokens.token;
        }
        catch (e) {
            console.error("[Nalog] Auth failed:", e);
            return null;
        }
    }
    return accessToken;
}
/**
 * Создать чек самозанятого при получении оплаты.
 * Вызывается из webhook-ов после подтверждения платежа.
 */
export async function createNalogReceipt(params) {
    const config = await getSystemConfig();
    const nalogConfig = config;
    const enabled = nalogConfig.nalogEnabled === true || nalogConfig.nalogEnabled === "true";
    if (!enabled)
        return { ok: false, error: "Nalog disabled" };
    const serviceName = nalogConfig.nalogServiceName?.trim() || params.description;
    const token = await getAccessToken();
    if (!token)
        return { ok: false, error: "Nalog auth failed — check INN/password" };
    try {
        const result = await nalogCreateIncome(token, {
            paymentType: "ACCOUNT",
            services: [{
                    name: serviceName.slice(0, 200) || "Оплата VPN-подписки",
                    amount: params.amount,
                    quantity: 1,
                }],
            totalAmount: params.amount,
            operationTime: (params.paidAt ?? new Date()).toISOString(),
            client: null,
        });
        const printUrl = nalogReceiptPrintUrl(result.approvedReceiptUuid);
        console.log("[Nalog] Receipt created:", result.approvedReceiptUuid, printUrl);
        return { ok: true, receiptUuid: result.approvedReceiptUuid, printUrl };
    }
    catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error("[Nalog] Create receipt error:", msg);
        return { ok: false, error: msg };
    }
}
/**
 * Проверить подключение к Мой Налог (аутентификация).
 */
export async function testNalogConnection() {
    const config = await getSystemConfig();
    const nalogConfig = config;
    const inn = nalogConfig.nalogInn?.trim();
    const password = nalogConfig.nalogPassword?.trim();
    const deviceId = nalogConfig.nalogDeviceId?.trim() || "stealthnet-bot-nalog";
    if (!inn || !password)
        return { ok: false, error: "ИНН и пароль не заданы" };
    try {
        const tokens = await nalogAuth(inn, password, deviceId);
        await saveTokens(tokens);
        return { ok: true, inn };
    }
    catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
}
//# sourceMappingURL=nalog.service.js.map