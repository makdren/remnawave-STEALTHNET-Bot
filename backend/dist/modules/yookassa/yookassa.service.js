/**
 * ЮKassa API — создание платежа (redirect на страницу оплаты).
 * Документация: https://yookassa.ru/developers/api#create_payment
 */
import { proxyFetch } from "../proxy-util/proxy-fetch.js";
import { getProxyUrl } from "../proxy-util/get-proxy-url.js";
const YOOKASSA_API = "https://api.yookassa.ru/v3";
/**
 * Создаёт платёж в ЮKassa. Возвращает confirmation_url для редиректа пользователя.
 * Idempotence-Key: генерируется из metadata.payment_id + timestamp для уникальности.
 */
export async function createYookassaPayment(params) {
    const { shopId, secretKey, amount, currency, returnUrl, description, metadata, customerEmail, savePaymentMethod } = params;
    if (!shopId?.trim() || !secretKey?.trim()) {
        return { ok: false, error: "YooKassa not configured" };
    }
    const valueStr = amount.toFixed(2);
    const currencyUpper = currency.toUpperCase();
    // Чек 54-ФЗ (обязателен, если в ЛК ЮKassa включены «Чеки от ЮKassa»)
    const receipt = {
        customer: {
            email: (customerEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail))
                ? customerEmail.trim()
                : "noreply@receipt.stealthnet.local",
        },
        items: [
            {
                description: description.slice(0, 128) || "Оплата подписки",
                quantity: "1.00",
                amount: { value: valueStr, currency: currencyUpper },
                vat_code: 1, // Без НДС
                payment_subject: "service",
                payment_mode: "full_payment",
            },
        ],
    };
    const body = {
        amount: { value: valueStr, currency: currencyUpper },
        capture: true,
        confirmation: { type: "redirect", return_url: returnUrl },
        description: description.slice(0, 128),
        metadata,
        receipt,
    };
    if (savePaymentMethod) {
        body.save_payment_method = true;
    }
    const idempotenceKey = `${metadata.payment_id ?? "pay"}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const auth = Buffer.from(`${shopId.trim()}:${secretKey.trim()}`).toString("base64");
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    try {
        const proxy = await getProxyUrl("payments");
        const res = await proxyFetch(`${YOOKASSA_API}/payments`, {
            method: "POST",
            signal: controller.signal,
            headers: {
                "Content-Type": "application/json",
                "Idempotence-Key": idempotenceKey,
                Authorization: `Basic ${auth}`,
            },
            body: JSON.stringify(body),
        }, proxy);
        clearTimeout(timeoutId);
        let data;
        try {
            data = (await res.json());
        }
        catch {
            return { ok: false, error: `YooKassa: ответ не JSON (${res.status})`, status: res.status };
        }
        if (!res.ok) {
            const parts = [data.description ?? data.code ?? res.statusText ?? "YooKassa error"];
            if (data.parameter)
                parts.push(`Параметр: ${data.parameter}`);
            return { ok: false, error: parts.join(". "), status: res.status };
        }
        const confirmationUrl = data.confirmation?.confirmation_url;
        if (!data.id || !confirmationUrl) {
            return { ok: false, error: "No id or confirmation_url in response" };
        }
        return {
            ok: true,
            paymentId: data.id,
            confirmationUrl,
            status: data.status ?? "pending",
        };
    }
    catch (e) {
        clearTimeout(timeoutId);
        const message = e instanceof Error ? e.message : String(e);
        const isNetwork = message === "fetch failed" ||
            message.includes("ECONNREFUSED") ||
            message.includes("ENOTFOUND") ||
            message.includes("ETIMEDOUT") ||
            message.includes("network") ||
            (e instanceof Error && e.name === "AbortError");
        if (isNetwork) {
            return {
                ok: false,
                error: "Сервер не может подключиться к ЮKassa (api.yookassa.ru). Проверьте доступ в интернет, firewall и DNS на сервере.",
            };
        }
        return { ok: false, error: message };
    }
}
export function isYookassaConfigured(shopId, secretKey) {
    return Boolean(shopId?.trim() && secretKey?.trim());
}
/**
 * Создаёт автоплатёж через сохранённый payment_method_id.
 * Не требует подтверждения пользователя — деньги списываются сразу (capture: true).
 */
export async function createYookassaAutopayment(params) {
    const { shopId, secretKey, amount, currency, paymentMethodId, description, metadata, customerEmail } = params;
    if (!shopId?.trim() || !secretKey?.trim()) {
        return { ok: false, error: "YooKassa not configured" };
    }
    const valueStr = amount.toFixed(2);
    const currencyUpper = currency.toUpperCase();
    const receipt = {
        customer: {
            email: (customerEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail))
                ? customerEmail.trim()
                : "noreply@receipt.stealthnet.local",
        },
        items: [
            {
                description: description.slice(0, 128) || "Автопродление подписки",
                quantity: "1.00",
                amount: { value: valueStr, currency: currencyUpper },
                vat_code: 1,
                payment_subject: "service",
                payment_mode: "full_payment",
            },
        ],
    };
    const body = {
        amount: { value: valueStr, currency: currencyUpper },
        capture: true,
        payment_method_id: paymentMethodId,
        description: description.slice(0, 128),
        metadata,
        receipt,
    };
    const idempotenceKey = `autopay-${metadata.payment_id ?? "pay"}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const auth = Buffer.from(`${shopId.trim()}:${secretKey.trim()}`).toString("base64");
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    try {
        const proxy = await getProxyUrl("payments");
        const res = await proxyFetch(`${YOOKASSA_API}/payments`, {
            method: "POST",
            signal: controller.signal,
            headers: {
                "Content-Type": "application/json",
                "Idempotence-Key": idempotenceKey,
                Authorization: `Basic ${auth}`,
            },
            body: JSON.stringify(body),
        }, proxy);
        clearTimeout(timeoutId);
        let data;
        try {
            data = (await res.json());
        }
        catch {
            return { ok: false, error: `YooKassa: ответ не JSON (${res.status})` };
        }
        if (!res.ok) {
            return { ok: false, error: data.description ?? data.code ?? res.statusText ?? "YooKassa error" };
        }
        if (!data.id) {
            return { ok: false, error: "No payment id in response" };
        }
        // Автоплатёж с capture: true должен мгновенно вернуть succeeded, если карта списалась.
        // pending / waiting_for_capture — это НЕ готовый к активации платёж (нужна доп. проверка/3DS),
        // поэтому активировать тариф сейчас нельзя — иначе тариф выдадут, а деньги не спишутся.
        if (data.status === "succeeded") {
            return { ok: true, paymentId: data.id, status: data.status };
        }
        if (data.status === "canceled") {
            const reason = data.cancellation_details?.reason ?? "unknown";
            return { ok: false, error: `Автоплатёж отклонён: ${reason}`, reason };
        }
        return {
            ok: false,
            error: `Автоплатёж не завершён (статус: ${data.status ?? "unknown"})`,
            reason: data.status ?? undefined,
        };
    }
    catch (e) {
        clearTimeout(timeoutId);
        const message = e instanceof Error ? e.message : String(e);
        const isNetwork = message === "fetch failed" ||
            message.includes("ECONNREFUSED") ||
            message.includes("ENOTFOUND") ||
            message.includes("ETIMEDOUT") ||
            message.includes("network") ||
            (e instanceof Error && e.name === "AbortError");
        if (isNetwork) {
            return { ok: false, error: "Сервер не может подключиться к ЮKassa" };
        }
        return { ok: false, error: message };
    }
}
//# sourceMappingURL=yookassa.service.js.map