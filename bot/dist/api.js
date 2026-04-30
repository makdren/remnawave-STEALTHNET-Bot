/**
 * STEALTHNET 3.0 — API клиент бота (вызовы бэкенда).
 */
const API_URL = (process.env.API_URL || "").replace(/\/$/, "");
if (!API_URL) {
    console.warn("API_URL not set in .env — bot API calls will fail");
}
function getHeaders(token) {
    const h = { "Content-Type": "application/json" };
    if (token)
        h["Authorization"] = `Bearer ${token}`;
    return h;
}
async function fetchJson(path, opts) {
    const res = await fetch(`${API_URL}${path}`, {
        method: opts?.method ?? "GET",
        headers: getHeaders(opts?.token),
        ...(opts?.body !== undefined && { body: JSON.stringify(opts.body) }),
    });
    const data = (await res.json().catch(() => ({})));
    if (!res.ok) {
        const msg = typeof data.message === "string" ? data.message : `HTTP ${res.status}`;
        throw new Error(msg);
    }
    return data;
}
/** Привязка Telegram к аккаунту по коду (вызывается ботом при /link КОД) */
export async function linkTelegramFromBot(code, telegramId, telegramUsername) {
    const botToken = process.env.BOT_TOKEN || "";
    const res = await fetch(`${API_URL}/api/public/link-telegram-from-bot`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "X-Telegram-Bot-Token": botToken,
        },
        body: JSON.stringify({ code: code.trim(), telegramId, telegramUsername: telegramUsername ?? "" }),
    });
    const data = (await res.json().catch(() => ({})));
    if (!res.ok) {
        const msg = typeof data.message === "string" ? data.message : `HTTP ${res.status}`;
        throw new Error(msg);
    }
    return data;
}
/** Подтверждение deep-link авторизации (бот → API) */
export async function confirmTelegramAuth(token, telegramId, telegramUsername) {
    const botToken = process.env.BOT_TOKEN || "";
    const res = await fetch(`${API_URL}/api/client/auth/telegram-login-confirm`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "X-Telegram-Bot-Token": botToken,
        },
        body: JSON.stringify({ token: token.trim(), telegramId, telegramUsername: telegramUsername ?? "" }),
    });
    const data = (await res.json().catch(() => ({})));
    if (!res.ok) {
        const msg = typeof data.message === "string" ? data.message : `HTTP ${res.status}`;
        throw new Error(msg);
    }
    return data;
}
/** Активный конкурс (для меню и ежедневной рассылки) */
export async function getActiveContest() {
    return fetchJson("/api/public/contests/active");
}
/** Публичный конфиг (тарифы, кнопки, способы оплаты, trial и т.д.) */
export async function getPublicConfig() {
    return fetchJson("/api/public/config");
}
/** Регистрация / вход по Telegram */
export async function registerByTelegram(body) {
    return fetchJson("/api/client/auth/register", { method: "POST", body });
}
/** Вход по коду 2FA (после register/login, когда бэкенд вернул requires2FA) */
export async function client2FALogin(tempToken, code) {
    return fetchJson("/api/client/auth/2fa-login", {
        method: "POST",
        body: { tempToken, code },
    });
}
/** Текущий пользователь */
export async function getMe(token) {
    return fetchJson("/api/client/auth/me", { token });
}
/** Подписка Remna (для ссылки VPN, статус, трафик) + отображаемое имя тарифа с сайта */
export async function getSubscription(token) {
    return fetchJson("/api/client/subscription", { token });
}
/** Подписка по конкретному UUID (для secondary/gift подписок) */
export async function getSubscriptionByUuid(token, uuid) {
    return fetchJson("/api/client/subscription/by-uuid/" + encodeURIComponent(uuid), { token });
}
/** Список устройств (HWID) пользователя в Remna */
export async function getClientDevices(token) {
    return fetchJson("/api/client/devices", { token });
}
/** Удалить устройство по HWID */
export async function postClientDeviceDelete(token, hwid) {
    return fetchJson("/api/client/devices/delete", { method: "POST", body: { hwid }, token });
}
/** Публичный список тарифов прокси по категориям */
export async function getPublicProxyTariffs() {
    return fetchJson("/api/public/proxy-tariffs");
}
/** Активные прокси-слоты клиента */
export async function getProxySlots(token) {
    return fetchJson("/api/client/proxy-slots", { token });
}
/** Публичный список тарифов Sing-box по категориям */
export async function getPublicSingboxTariffs() {
    return fetchJson("/api/public/singbox-tariffs");
}
/** Активные Sing-box слоты клиента (с subscriptionLink) */
export async function getSingboxSlots(token) {
    return fetchJson("/api/client/singbox-slots", { token });
}
/** Публичный список тарифов по категориям (emoji из админки по коду ordinary/premium) */
export async function getPublicTariffs() {
    return fetchJson("/api/public/tariffs");
}
/** Создать платёж Platega (возвращает paymentUrl). Для опции — extraOption. Для прокси — proxyTariffId. */
export async function createPlategaPayment(token, body) {
    return fetchJson("/api/client/payments/platega", { method: "POST", body, token });
}
/** Создать платёж ЮMoney (оплата картой). Для тарифа — tariffId, для прокси — proxyTariffId, для опции — extraOption. */
export async function createYoomoneyPayment(token, body) {
    return fetchJson("/api/client/yoomoney/create-form-payment", { method: "POST", body, token });
}
/** Создать платёж ЮKassa (карта, СБП). Только RUB. Для тарифа — tariffId, для прокси — proxyTariffId, для опции — extraOption. */
export async function createYookassaPayment(token, body) {
    return fetchJson("/api/client/yookassa/create-payment", { method: "POST", body, token });
}
/** Crypto Pay (Crypto Bot) — создать инвойс, вернуть ссылку на оплату */
export async function createCryptopayPayment(token, body) {
    const res = await fetchJson("/api/client/cryptopay/create-payment", { method: "POST", body, token });
    return { paymentId: res.paymentId, payUrl: res.payUrl };
}
/** Обновить профиль (язык, валюта) */
export async function updateProfile(token, body) {
    return fetchJson("/api/client/profile", { method: "PATCH", body, token });
}
/** Включить/выключить автопродление */
export async function toggleAutoRenew(token, enabled) {
    return fetchJson("/api/client/auto-renew", { method: "PATCH", body: { enabled }, token });
}
/** Активировать триал */
export async function activateTrial(token) {
    return fetchJson("/api/client/trial", { method: "POST", body: {}, token });
}
/** Оплата тарифа или прокси-тарифа балансом */
export async function payByBalance(token, opts) {
    return fetchJson("/api/client/payments/balance", { method: "POST", body: opts, token });
}
/** Оплата опции (доп. трафик/устройства/сервер) с баланса */
export async function payOptionByBalance(token, extraOption) {
    return fetchJson("/api/client/payments/balance/option", { method: "POST", body: { extraOption }, token });
}
/** Активировать промо-ссылку (PromoGroup) */
export async function activatePromo(token, code) {
    return fetchJson("/api/client/promo/activate", { method: "POST", body: { code }, token });
}
/** Проверить промокод (PromoCode — скидка / бесплатные дни) */
export async function checkPromoCode(token, code) {
    return fetchJson("/api/client/promo-code/check", { method: "POST", body: { code }, token });
}
/** Активировать промокод FREE_DAYS */
export async function activatePromoCode(token, code) {
    return fetchJson("/api/client/promo-code/activate", { method: "POST", body: { code }, token });
}
// ——— Bot Admin API (X-Telegram-Bot-Token + telegramId в query/body) ———
const BOT_ADMIN_BASE = "/api/bot-admin";
export async function getBotAdminStats(telegramId) {
    const botToken = process.env.BOT_TOKEN || "";
    const res = await fetch(`${API_URL}${BOT_ADMIN_BASE}/stats?telegramId=${telegramId}`, {
        headers: { "X-Telegram-Bot-Token": botToken },
    });
    const data = (await res.json().catch(() => ({})));
    if (!res.ok) {
        const msg = typeof data.message === "string" ? data.message : `HTTP ${res.status}`;
        throw new Error(msg);
    }
    return data;
}
export async function getBotAdminNotificationSettings(telegramId) {
    const botToken = process.env.BOT_TOKEN || "";
    const res = await fetch(`${API_URL}${BOT_ADMIN_BASE}/notification-settings?telegramId=${telegramId}`, {
        headers: { "X-Telegram-Bot-Token": botToken },
    });
    const data = (await res.json().catch(() => ({})));
    if (!res.ok) {
        const msg = typeof data.message === "string" ? data.message : `HTTP ${res.status}`;
        throw new Error(msg);
    }
    return data;
}
export async function patchBotAdminNotificationSettings(telegramId, settings) {
    const botToken = process.env.BOT_TOKEN || "";
    const res = await fetch(`${API_URL}${BOT_ADMIN_BASE}/notification-settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "X-Telegram-Bot-Token": botToken },
        body: JSON.stringify({ telegramId, ...settings }),
    });
    const data = (await res.json().catch(() => ({})));
    if (!res.ok) {
        const msg = typeof data.message === "string" ? data.message : `HTTP ${res.status}`;
        throw new Error(msg);
    }
    return data;
}
export async function getBotAdminClients(telegramId, page, search) {
    const params = new URLSearchParams({ telegramId: String(telegramId), page: String(page), limit: "8" });
    if (search?.trim())
        params.set("search", search.trim());
    const botToken = process.env.BOT_TOKEN || "";
    const res = await fetch(`${API_URL}${BOT_ADMIN_BASE}/clients?${params}`, {
        headers: { "X-Telegram-Bot-Token": botToken },
    });
    const data = (await res.json().catch(() => ({})));
    if (!res.ok) {
        const msg = typeof data.message === "string" ? data.message : `HTTP ${res.status}`;
        throw new Error(msg);
    }
    return data;
}
export async function getBotAdminClient(telegramId, clientId) {
    const botToken = process.env.BOT_TOKEN || "";
    const res = await fetch(`${API_URL}${BOT_ADMIN_BASE}/clients/${encodeURIComponent(clientId)}?telegramId=${telegramId}`, {
        headers: { "X-Telegram-Bot-Token": botToken },
    });
    const data = (await res.json().catch(() => ({})));
    if (!res.ok) {
        const msg = typeof data.message === "string" ? data.message : `HTTP ${res.status}`;
        throw new Error(msg);
    }
    return data;
}
export async function patchBotAdminClientBlock(telegramId, clientId, isBlocked, blockReason) {
    const botToken = process.env.BOT_TOKEN || "";
    const res = await fetch(`${API_URL}${BOT_ADMIN_BASE}/clients/${encodeURIComponent(clientId)}/block`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "X-Telegram-Bot-Token": botToken },
        body: JSON.stringify({ telegramId, isBlocked, blockReason }),
    });
    const data = (await res.json().catch(() => ({})));
    if (!res.ok) {
        const msg = typeof data.message === "string" ? data.message : `HTTP ${res.status}`;
        throw new Error(msg);
    }
    return data;
}
export async function getBotAdminPayments(telegramId, status, page) {
    const botToken = process.env.BOT_TOKEN || "";
    const res = await fetch(`${API_URL}${BOT_ADMIN_BASE}/payments?telegramId=${telegramId}&status=${status}&page=${page}&limit=8`, { headers: { "X-Telegram-Bot-Token": botToken } });
    const data = (await res.json().catch(() => ({})));
    if (!res.ok) {
        const msg = typeof data.message === "string" ? data.message : `HTTP ${res.status}`;
        throw new Error(msg);
    }
    return data;
}
export async function patchBotAdminPaymentMarkPaid(telegramId, paymentId) {
    const botToken = process.env.BOT_TOKEN || "";
    const res = await fetch(`${API_URL}${BOT_ADMIN_BASE}/payments/${encodeURIComponent(paymentId)}/mark-paid`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "X-Telegram-Bot-Token": botToken },
        body: JSON.stringify({ telegramId }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
        const msg = typeof data.message === "string" ? data.message : `HTTP ${res.status}`;
        throw new Error(msg);
    }
    return data;
}
export async function getBotAdminBroadcastCount(telegramId) {
    const botToken = process.env.BOT_TOKEN || "";
    const res = await fetch(`${API_URL}${BOT_ADMIN_BASE}/broadcast/count?telegramId=${telegramId}`, {
        headers: { "X-Telegram-Bot-Token": botToken },
    });
    const data = (await res.json().catch(() => ({})));
    if (!res.ok) {
        const msg = typeof data.message === "string" ? data.message : `HTTP ${res.status}`;
        throw new Error(msg);
    }
    return data;
}
export async function postBotAdminBroadcast(telegramId, message, channel, photoFileId, buttonText, buttonUrl) {
    const botToken = process.env.BOT_TOKEN || "";
    const res = await fetch(`${API_URL}${BOT_ADMIN_BASE}/broadcast`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Telegram-Bot-Token": botToken },
        body: JSON.stringify({ telegramId, message, channel, photoFileId: photoFileId ?? undefined, buttonText: buttonText ?? undefined, buttonUrl: buttonUrl ?? undefined }),
    });
    const data = (await res.json().catch(() => ({})));
    if (!res.ok) {
        const msg = typeof data.message === "string" ? data.message : `HTTP ${res.status}`;
        throw new Error(msg);
    }
    return data;
}
export async function patchBotAdminClientBalance(telegramId, clientId, amount) {
    const botToken = process.env.BOT_TOKEN || "";
    const res = await fetch(`${API_URL}${BOT_ADMIN_BASE}/clients/${encodeURIComponent(clientId)}/balance`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "X-Telegram-Bot-Token": botToken },
        body: JSON.stringify({ telegramId, amount }),
    });
    const data = (await res.json().catch(() => ({})));
    if (!res.ok) {
        const msg = typeof data.message === "string" ? data.message : `HTTP ${res.status}`;
        throw new Error(msg);
    }
    return data;
}
export async function postBotAdminClientRemnaRevoke(telegramId, clientId) {
    const botToken = process.env.BOT_TOKEN || "";
    const res = await fetch(`${API_URL}${BOT_ADMIN_BASE}/clients/${encodeURIComponent(clientId)}/remna/revoke-subscription`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Telegram-Bot-Token": botToken },
        body: JSON.stringify({ telegramId }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok)
        throw new Error(typeof data.message === "string" ? data.message : `HTTP ${res.status}`);
    return data;
}
export async function postBotAdminClientRemnaDisable(telegramId, clientId) {
    const botToken = process.env.BOT_TOKEN || "";
    const res = await fetch(`${API_URL}${BOT_ADMIN_BASE}/clients/${encodeURIComponent(clientId)}/remna/disable`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Telegram-Bot-Token": botToken },
        body: JSON.stringify({ telegramId }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok)
        throw new Error(typeof data.message === "string" ? data.message : `HTTP ${res.status}`);
    return data;
}
export async function postBotAdminClientRemnaEnable(telegramId, clientId) {
    const botToken = process.env.BOT_TOKEN || "";
    const res = await fetch(`${API_URL}${BOT_ADMIN_BASE}/clients/${encodeURIComponent(clientId)}/remna/enable`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Telegram-Bot-Token": botToken },
        body: JSON.stringify({ telegramId }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok)
        throw new Error(typeof data.message === "string" ? data.message : `HTTP ${res.status}`);
    return data;
}
export async function postBotAdminClientRemnaResetTraffic(telegramId, clientId) {
    const botToken = process.env.BOT_TOKEN || "";
    const res = await fetch(`${API_URL}${BOT_ADMIN_BASE}/clients/${encodeURIComponent(clientId)}/remna/reset-traffic`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Telegram-Bot-Token": botToken },
        body: JSON.stringify({ telegramId }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok)
        throw new Error(typeof data.message === "string" ? data.message : `HTTP ${res.status}`);
    return data;
}
export async function getBotAdminRemnaSquadsInternal(telegramId) {
    const botToken = process.env.BOT_TOKEN || "";
    const res = await fetch(`${API_URL}${BOT_ADMIN_BASE}/remna/squads/internal?telegramId=${telegramId}`, {
        headers: { "X-Telegram-Bot-Token": botToken },
    });
    const data = (await res.json().catch(() => ({})));
    if (!res.ok) {
        const msg = typeof data.message === "string" ? data.message : `HTTP ${res.status}`;
        throw new Error(msg);
    }
    return data;
}
export async function getBotAdminClientRemna(telegramId, clientId) {
    const botToken = process.env.BOT_TOKEN || "";
    const res = await fetch(`${API_URL}${BOT_ADMIN_BASE}/clients/${encodeURIComponent(clientId)}/remna?telegramId=${telegramId}`, { headers: { "X-Telegram-Bot-Token": botToken } });
    const data = (await res.json().catch(() => ({})));
    if (!res.ok) {
        const msg = typeof data.message === "string" ? data.message : `HTTP ${res.status}`;
        throw new Error(msg);
    }
    return data;
}
export async function postBotAdminClientRemnaSquadAdd(telegramId, clientId, squadUuid) {
    const botToken = process.env.BOT_TOKEN || "";
    const res = await fetch(`${API_URL}${BOT_ADMIN_BASE}/clients/${encodeURIComponent(clientId)}/remna/squads/add`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Telegram-Bot-Token": botToken },
        body: JSON.stringify({ telegramId, squadUuid }),
    });
    const data = (await res.json().catch(() => ({})));
    if (!res.ok) {
        const msg = typeof data.message === "string" ? data.message : `HTTP ${res.status}`;
        throw new Error(msg);
    }
    return data;
}
export async function postBotAdminClientRemnaSquadRemove(telegramId, clientId, squadUuid) {
    const botToken = process.env.BOT_TOKEN || "";
    const res = await fetch(`${API_URL}${BOT_ADMIN_BASE}/clients/${encodeURIComponent(clientId)}/remna/squads/remove`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Telegram-Bot-Token": botToken },
        body: JSON.stringify({ telegramId, squadUuid }),
    });
    const data = (await res.json().catch(() => ({})));
    if (!res.ok) {
        const msg = typeof data.message === "string" ? data.message : `HTTP ${res.status}`;
        throw new Error(msg);
    }
    return data;
}
// ——— Gift / Secondary Subscriptions API ———
/** Купить дополнительную подписку (оплата балансом) */
export async function buyGiftSubscription(token, body) {
    return fetchJson("/api/client/gift/buy", { method: "POST", body, token });
}
/** Список дополнительных подписок клиента */
export async function getGiftSubscriptions(token) {
    return fetchJson("/api/client/gift/subscriptions", { token });
}
/** Создать подарочный код */
export async function createGiftCode(token, body) {
    return fetchJson("/api/client/gift/create-code", { method: "POST", body, token });
}
/** Активировать подарочный код */
export async function redeemGiftCode(token, code) {
    return fetchJson("/api/client/gift/redeem", { method: "POST", body: { code }, token });
}
/** Отменить подарочный код */
export async function cancelGiftCode(token, codeOrId) {
    return fetchJson("/api/client/gift/cancel/" + encodeURIComponent(codeOrId), { method: "DELETE", token });
}
/** Список подарочных кодов клиента */
export async function getGiftCodes(token) {
    return fetchJson("/api/client/gift/codes", { token });
}
/** Активировать подписку на себя (снять GIFT_RESERVED) */
export async function activateGiftForSelf(token, subscriptionId) {
    return fetchJson("/api/client/gift/activate-self", { method: "POST", body: { subscriptionId }, token });
}
/** Удалить дополнительную подписку */
export async function deleteGiftSubscription(token, subscriptionId) {
    return fetchJson("/api/client/gift/subscription/" + encodeURIComponent(subscriptionId), { method: "DELETE", token });
}
/** URL подписки для вторичного аккаунта */
export async function getGiftSubscriptionUrl(token, subscriptionId) {
    return fetchJson("/api/client/gift/subscription-url/" + encodeURIComponent(subscriptionId), { token });
}
