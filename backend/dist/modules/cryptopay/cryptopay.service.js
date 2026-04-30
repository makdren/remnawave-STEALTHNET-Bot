/**
 * Crypto Pay API (Crypto Bot) — создание инвойсов и приём webhook.
 * Документация: https://help.send.tg/en/articles/10279948-crypto-pay-api
 */
import { createHmac, createHash } from "crypto";
import { proxyFetch } from "../proxy-util/proxy-fetch.js";
import { getProxyUrl } from "../proxy-util/get-proxy-url.js";
const MAINNET_BASE = "https://pay.crypt.bot/api";
const TESTNET_BASE = "https://testnet-pay.crypt.bot/api";
export function isCryptopayConfigured(config) {
    return Boolean(config?.apiToken?.trim());
}
function getBaseUrl(testnet) {
    return testnet ? TESTNET_BASE : MAINNET_BASE;
}
/**
 * Создаёт инвойс в Crypto Pay. Возвращает URL для оплаты (bot_invoice_url).
 */
export async function createCryptopayInvoice(params) {
    const { config, amount, description, payload, expiresIn = 3600 } = params;
    const token = config.apiToken?.trim();
    if (!token)
        return { ok: false, error: "Crypto Pay not configured" };
    const baseUrl = getBaseUrl(Boolean(config.testnet));
    const currencyType = params.currencyType ?? "crypto";
    const body = {
        amount: String(amount),
        description: description.slice(0, 1024),
        payload: payload.slice(0, 4096),
        expires_in: Math.min(2678400, Math.max(1, expiresIn)),
    };
    if (currencyType === "crypto") {
        body.asset = params.asset ?? "USDT";
    }
    else {
        body.currency_type = "fiat";
        body.fiat = params.fiat ?? "USD";
    }
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    try {
        const proxy = await getProxyUrl("payments");
        const res = await proxyFetch(`${baseUrl}/createInvoice`, {
            method: "POST",
            signal: controller.signal,
            headers: {
                "Content-Type": "application/json",
                "Crypto-Pay-API-Token": token,
            },
            body: JSON.stringify(body),
        }, proxy);
        clearTimeout(timeoutId);
        let data;
        try {
            data = (await res.json());
        }
        catch {
            return { ok: false, error: `Crypto Pay: не JSON (${res.status})`, status: res.status };
        }
        if (!data.ok || !data.result) {
            const code = data.error?.code ?? data.error?.name ?? res.statusText;
            return { ok: false, error: `Crypto Pay: ${code}`, status: res.status };
        }
        const payUrl = data.result.bot_invoice_url ?? data.result.mini_app_invoice_url ?? data.result.web_app_invoice_url;
        if (!data.result.invoice_id || !payUrl) {
            return { ok: false, error: "Crypto Pay: нет invoice_id или pay URL в ответе" };
        }
        return {
            ok: true,
            invoiceId: data.result.invoice_id,
            payUrl,
            miniAppPayUrl: data.result.mini_app_invoice_url,
            webAppPayUrl: data.result.web_app_invoice_url,
        };
    }
    catch (e) {
        clearTimeout(timeoutId);
        const message = e instanceof Error ? e.message : String(e);
        if (message.includes("fetch") || message.includes("ECONNREFUSED") || message.includes("ENOTFOUND") || message.includes("ETIMEDOUT") || (e instanceof Error && e.name === "AbortError")) {
            return { ok: false, error: "Нет связи с Crypto Pay. Проверьте интернет и настройки." };
        }
        return { ok: false, error: message };
    }
}
/**
 * Проверка подписи webhook: HMAC-SHA256(body, SHA256(token)) === header crypto-pay-api-signature
 */
export function verifyCryptopayWebhookSignature(token, rawBody, signatureHeader) {
    if (!token?.trim() || !signatureHeader?.trim())
        return false;
    const secret = createHash("sha256").update(token.trim()).digest();
    const hmac = createHmac("sha256", secret).update(rawBody).digest("hex");
    return hmac === signatureHeader.trim();
}
//# sourceMappingURL=cryptopay.service.js.map