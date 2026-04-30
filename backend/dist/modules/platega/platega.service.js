/**
 * Platega.io — создание платежей и обработка callback
 * https://docs.platega.io/
 */
import { proxyFetch } from "../proxy-util/proxy-fetch.js";
import { getProxyUrl } from "../proxy-util/get-proxy-url.js";
const PLATEGA_API_BASE = "https://app.platega.io";
export function isPlategaConfigured(config) {
    return Boolean(config?.merchantId?.trim() && config?.secret?.trim());
}
/**
 * Создать транзакцию в Platega, получить ссылку на оплату
 * paymentMethod: 2=СПБ, 11=Карты, 12=Международный, 13=Криптовалюта
 */
export async function createPlategaTransaction(config, params) {
    const { amount, currency, orderId, paymentMethod, returnUrl, failedUrl, description } = params;
    const url = `${PLATEGA_API_BASE}/transaction/process`;
    const body = {
        paymentMethod: Number(paymentMethod) || 2,
        paymentDetails: { amount: Number(amount), currency: currency.toUpperCase() },
        description: description || `Оплата заказа ${orderId}`,
        return: returnUrl,
        failedUrl,
        payload: orderId, // orderId передаём через payload — единственное кастомное поле в API Platega
    };
    const headers = {
        "Content-Type": "application/json",
        "X-MerchantId": config.merchantId.trim(),
        "X-Secret": config.secret.trim(),
    };
    try {
        const proxy = await getProxyUrl("payments");
        const res = await proxyFetch(url, {
            method: "POST",
            headers,
            body: JSON.stringify(body),
        }, proxy);
        const text = await res.text();
        let data;
        try {
            data = text ? JSON.parse(text) : {};
        }
        catch {
            return { error: `Platega: invalid response (${res.status})` };
        }
        if (res.status === 401) {
            return { error: "Platega: неверный Merchant ID или секрет" };
        }
        if (res.status !== 200) {
            const msg = data.message || data.error || text?.slice(0, 200);
            return { error: `Platega: ${msg}` };
        }
        const paymentUrl = data.redirect || data.url || data.paymentUrl;
        const transactionId = data.transactionId || data.id;
        if (!paymentUrl) {
            return { error: "Platega не вернул ссылку на оплату" };
        }
        return { paymentUrl, transactionId: transactionId || "" };
    }
    catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        return { error: `Platega: ${message}` };
    }
}
//# sourceMappingURL=platega.service.js.map