import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { randomBytes } from "crypto";
import { prisma } from "../../db.js";
import { env } from "../../config/index.js";
const SALT_ROUNDS = 12;
const _langPackCache = new Map();
const LANG_PACK_TTL = 60_000;
async function loadAllLanguagePacks(activeLangs) {
    const result = {};
    const langKeys = activeLangs.filter((l) => l !== "ru").map((l) => `lang_pack_${l}`);
    if (!langKeys.length)
        return result;
    const now = Date.now();
    const toLoad = [];
    for (const k of langKeys) {
        const cached = _langPackCache.get(k);
        if (cached && now - cached.ts < LANG_PACK_TTL) {
            const code = k.replace("lang_pack_", "");
            result[code] = cached.data;
        }
        else {
            toLoad.push(k);
        }
    }
    if (toLoad.length) {
        const rows = await prisma.systemSetting.findMany({ where: { key: { in: toLoad } } });
        for (const row of rows) {
            const code = row.key.replace("lang_pack_", "");
            try {
                const parsed = JSON.parse(row.value);
                _langPackCache.set(row.key, { data: parsed, ts: now });
                result[code] = parsed;
            }
            catch { /* skip invalid JSON */ }
        }
    }
    return result;
}
export function clearLangPackCache() {
    _langPackCache.clear();
}
export async function hashPassword(password) {
    return bcrypt.hash(password, SALT_ROUNDS);
}
export async function verifyPassword(password, hash) {
    return bcrypt.compare(password, hash);
}
export function signClientToken(clientId, expiresIn = "7d") {
    return jwt.sign({ clientId, type: "client_access" }, env.JWT_SECRET, { expiresIn });
}
export function verifyClientToken(token) {
    try {
        const decoded = jwt.verify(token, env.JWT_SECRET);
        return decoded?.type === "client_access" ? decoded : null;
    }
    catch {
        return null;
    }
}
/** Временный токен для шага «ввод кода 2FA» после успешной проверки пароля/Telegram. Живёт 5 минут. */
export function signClient2FAPendingToken(clientId, expiresIn = "5m") {
    return jwt.sign({ clientId, type: "client_2fa_pending" }, env.JWT_SECRET, { expiresIn });
}
export function verifyClient2FAPendingToken(token) {
    try {
        const decoded = jwt.verify(token, env.JWT_SECRET);
        return decoded?.type === "client_2fa_pending" ? decoded : null;
    }
    catch {
        return null;
    }
}
export function generateReferralCode() {
    return "REF-" + randomBytes(4).toString("hex").toUpperCase();
}
const SYSTEM_CONFIG_KEYS = [
    "active_languages", "active_currencies", "default_language", "default_currency",
    "default_referral_percent", "referral_percent_level_2", "referral_percent_level_3",
    "trial_days", "trial_squad_uuid", "trial_device_limit", "trial_traffic_limit",
    "service_name", "logo", "logo_bot", "favicon", "remna_client_url",
    "smtp_host", "smtp_port", "smtp_secure", "smtp_user", "smtp_password",
    "smtp_from_email", "smtp_from_name", "public_app_url",
    "telegram_bot_token", "telegram_bot_username", "bot_admin_telegram_ids",
    "notification_telegram_group_id",
    "notification_topic_new_clients",
    "notification_topic_payments",
    "notification_topic_tickets",
    "platega_merchant_id", "platega_secret", "platega_methods", "payment_providers_config",
    "gramads_api_key", // Gramads.net — ключ для рекламного кабинета "Продвижение VPN"
    "yoomoney_client_id", "yoomoney_client_secret", "yoomoney_receiver_wallet", "yoomoney_notification_secret",
    "yookassa_shop_id", "yookassa_secret_key", "yookassa_recurring_enabled",
    "cryptopay_api_token", "cryptopay_testnet",
    "heleket_merchant_id", "heleket_api_key",
    "groq_api_key", "groq_model", "groq_fallback_1", "groq_fallback_2", "groq_fallback_3", "ai_system_prompt",
    "bot_buttons", "bot_buttons_per_row", "bot_back_label", "bot_menu_texts", "bot_menu_line_visibility", "bot_inner_button_styles",
    "bot_tariffs_text", "bot_tariffs_fields", "bot_payment_text",
    "bot_emojis", // JSON: { "TRIAL": { "unicode": "🎁", "tgEmojiId": "..." }, "PACKAGE": ... } — эмодзи кнопок/текста, TG ID для премиум
    "category_emojis", // JSON: { "ordinary": "📦", "premium": "⭐" } — эмодзи категорий по коду
    "subscription_page_config",
    "support_link", "agreement_link", "offer_link", "instructions_link", // Поддержка: тех поддержка, соглашения, оферта, инструкции
    "tickets_enabled", // Тикет-система: true/false
    "admin_front_notifications_enabled", // Всплывающие уведомления в админке: true/false
    "theme_accent", // Глобальная цветовая тема: default, blue, violet, rose, orange, green, emerald, cyan, amber, red, pink, indigo
    "allow_user_theme_change", // Разрешить пользователям менять тему: true/false
    "force_subscribe_enabled", "force_subscribe_channel_id", "force_subscribe_message", // Принудительная подписка на канал/группу
    "blacklist_enabled", // Блокировка пользователей из Community Blacklist
    // Продажа опций: доп. трафик, доп. устройства, доп. серверы (сквады)
    "sell_options_enabled", "sell_options_traffic_enabled", "sell_options_traffic_products",
    "sell_options_devices_enabled", "sell_options_devices_products",
    "sell_options_servers_enabled", "sell_options_servers_products",
    "google_analytics_id", "yandex_metrika_id", // Маркетинг: счётчики для кабинета
    "auto_broadcast_cron", // Расписание авто-рассылки (cron, например "0 9 * * *" = 9:00 каждый день)
    "skip_email_verification", // Регистрация без подтверждения почты: true/false
    "use_remna_subscription_page", // Кнопка VPN в боте ведёт на страницу подписки Remna вместо кабинета: true/false
    "ai_chat_enabled", // AI-чат в кабинете включён: true/false
    // Гибкий тариф (собери сам): цена за день, устройство, трафик или безлимит, сквад
    "custom_build_enabled",
    "custom_build_price_per_day",
    "custom_build_price_per_device",
    "custom_build_traffic_mode", // "unlimited" | "per_gb"
    "custom_build_price_per_gb",
    "custom_build_squad_uuid",
    "custom_build_currency",
    "custom_build_max_days",
    "custom_build_max_devices",
    "default_auto_renew_enabled",
    "auto_renew_days_before_expiry",
    "auto_renew_notify_days_before",
    "auto_renew_grace_period_days",
    "auto_renew_max_retries",
    // OAuth: Google, Apple
    "google_login_enabled", "google_client_id", "google_client_secret",
    "apple_login_enabled", "apple_client_id", "apple_team_id", "apple_key_id", "apple_private_key",
    // Лендинг
    "landing_enabled", "landing_hero_title", "landing_hero_subtitle", "landing_hero_cta_text",
    "landing_hero_badge", "landing_hero_hint", "landing_show_tariffs", "landing_contacts",
    "landing_feature_1_label", "landing_feature_1_sub", "landing_feature_2_label", "landing_feature_2_sub",
    "landing_feature_3_label", "landing_feature_3_sub", "landing_feature_4_label", "landing_feature_4_sub",
    "landing_feature_5_label", "landing_feature_5_sub",
    "video_instructions_enabled", "video_instructions",
    "notification_topic_backups", "auto_backup_enabled", "auto_backup_cron",
    "landing_benefits_title", "landing_benefits_subtitle",
    "landing_benefit_1_title", "landing_benefit_1_desc", "landing_benefit_2_title", "landing_benefit_2_desc",
    "landing_benefit_3_title", "landing_benefit_3_desc", "landing_benefit_4_title", "landing_benefit_4_desc",
    "landing_benefit_5_title", "landing_benefit_5_desc", "landing_benefit_6_title", "landing_benefit_6_desc",
    "landing_tariffs_title", "landing_tariffs_subtitle", "landing_devices_title", "landing_devices_subtitle",
    "landing_faq_title", "landing_faq_json", "landing_offer_link", "landing_privacy_link", "landing_footer_text",
    "landing_hero_headline_1", "landing_hero_headline_2", "landing_header_badge",
    "landing_button_login", "landing_button_login_cabinet",
    "landing_nav_benefits", "landing_nav_tariffs", "landing_nav_devices", "landing_nav_faq",
    "landing_benefits_badge", "landing_default_payment_text", "landing_button_choose_tariff",
    "landing_no_tariffs_message", "landing_button_watch_tariffs", "landing_button_start", "landing_button_open_cabinet",
    "landing_journey_steps_json", "landing_signal_cards_json", "landing_trust_points_json",
    "landing_experience_panels_json", "landing_devices_list_json", "landing_quick_start_json",
    "landing_infra_title", "landing_network_cockpit_text", "landing_pulse_title",
    "landing_comfort_title", "landing_comfort_badge", "landing_principles_title",
    "landing_tech_title", "landing_tech_desc", "landing_category_subtitle",
    "landing_tariff_default_desc", "landing_tariff_bullet_1", "landing_tariff_bullet_2", "landing_tariff_bullet_3",
    "landing_lowest_tariff_desc", "landing_devices_cockpit_text",
    "landing_universality_title", "landing_universality_desc",
    "landing_quick_setup_title", "landing_quick_setup_desc",
    "landing_premium_service_title", "landing_premium_service_para1", "landing_premium_service_para2",
    "landing_how_it_works_title", "landing_how_it_works_desc",
    "landing_stats_platforms", "landing_stats_tariffs_label", "landing_stats_access_label", "landing_stats_payment_methods",
    "landing_ready_to_connect_eyebrow", "landing_ready_to_connect_title", "landing_ready_to_connect_desc",
    "landing_show_features", "landing_show_benefits", "landing_show_devices", "landing_show_faq", "landing_show_how_it_works", "landing_show_cta",
    // Прокси
    "proxy_enabled", "proxy_url", "proxy_telegram", "proxy_payments",
    // Мой Налог (самозанятые)
    "nalog_enabled", "nalog_inn", "nalog_password", "nalog_device_id", "nalog_service_name",
    // Карта нод (Geo Map)
    "geo_map_enabled", "geo_cache_ttl", "maxmind_db_path",
    // Дополнительные подписки и подарки
    "gift_subscriptions_enabled", "gift_code_expiry_hours", "max_additional_subscriptions",
    "gift_code_format_length", "gift_rate_limit_per_minute",
    "gift_expiry_notification_days", "gift_referral_enabled", "gift_message_max_length",
];
const DEFAULT_BOT_BUTTONS = [
    { id: "tariffs", visible: true, label: "📦 Тарифы", order: 0, style: "success", emojiKey: "PACKAGE" },
    { id: "proxy", visible: true, label: "🌐 Прокси", order: 0.5, style: "primary", emojiKey: "SERVERS" },
    { id: "my_proxy", visible: true, label: "📋 Мои прокси", order: 0.6, style: "primary", emojiKey: "SERVERS" },
    { id: "singbox", visible: true, label: "🔑 Доступы", order: 0.55, style: "primary", emojiKey: "SERVERS" },
    { id: "my_singbox", visible: true, label: "📋 Мои доступы", order: 0.65, style: "primary", emojiKey: "SERVERS" },
    { id: "profile", visible: true, label: "👤 Профиль", order: 1, style: "", emojiKey: "PUZZLE" },
    { id: "devices", visible: true, label: "📱 Устройства", order: 1.5, style: "primary", emojiKey: "DEVICES" },
    { id: "topup", visible: true, label: "💳 Пополнить баланс", order: 2, style: "success", emojiKey: "CARD" },
    { id: "referral", visible: true, label: "🔗 Реферальная программа", order: 3, style: "primary", emojiKey: "LINK" },
    { id: "trial", visible: true, label: "🎁 Попробовать бесплатно", order: 4, style: "success", emojiKey: "TRIAL" },
    { id: "vpn", visible: true, label: "🌐 Подключиться к VPN", order: 5, style: "danger", emojiKey: "SERVERS", onePerRow: true },
    { id: "cabinet", visible: true, label: "🌐 Web Кабинет", order: 6, style: "primary", emojiKey: "SERVERS" },
    { id: "tickets", visible: true, label: "🎫 Тикеты", order: 6.5, style: "primary", emojiKey: "NOTE" },
    { id: "support", visible: true, label: "🆘 Поддержка", order: 7, style: "primary", emojiKey: "NOTE" },
    { id: "promocode", visible: true, label: "🎟️ Промокод", order: 8, style: "primary", emojiKey: "STAR" },
    { id: "extra_options", visible: true, label: "➕ Доп. опции", order: 9, style: "primary", emojiKey: "PACKAGE" },
];
const DEFAULT_BOT_MENU_TEXTS = {
    welcomeTitlePrefix: "🛡 ",
    welcomeGreeting: "👋 Добро пожаловать в ",
    balancePrefix: "💰 Баланс: ",
    tariffPrefix: "💎 Ваш тариф : ",
    subscriptionPrefix: "{{CHART}} Статус подписки — ",
    statusInactive: "{{STATUS_INACTIVE}} Истекла",
    statusActive: "{{STATUS_ACTIVE}} Активна",
    statusExpired: "{{STATUS_EXPIRED}} Истекла",
    statusLimited: "{{STATUS_LIMITED}} Ограничена",
    statusDisabled: "{{STATUS_DISABLED}} Отключена",
    expirePrefix: "📅 до ",
    daysLeftPrefix: "⏰ осталось ",
    devicesLabel: "📱 Устройств: ",
    devicesAvailable: " доступно",
    trafficPrefix: "📈 Трафик — ",
    linkLabel: "🔗 Ссылка подключения:",
    chooseAction: "Выберите действие:",
};
const DEFAULT_BOT_TARIFFS_TEXT = "Тарифы\n\n{{CATEGORY}}\n{{TARIFFS}}\n\nВыберите тариф для оплаты:";
const DEFAULT_BOT_PAYMENT_TEXT = "Оплата: {{NAME}} — {{PRICE}}\n\n{{ACTION}}";
const DEFAULT_BOT_TARIFF_LINE_FIELDS = {
    name: true,
    durationDays: false,
    price: true,
    currency: true,
    trafficLimit: false,
    deviceLimit: false,
};
const DEFAULT_BOT_MENU_LINE_VISIBILITY = {
    welcomeTitlePrefix: true,
    welcomeGreeting: true,
    balancePrefix: true,
    tariffPrefix: true,
    subscriptionPrefix: true,
    expirePrefix: true,
    daysLeftPrefix: true,
    devicesLabel: true,
    trafficPrefix: true,
    linkLabel: true,
    chooseAction: true,
};
const DEFAULT_BOT_INNER_BUTTON_STYLES = {
    tariffPay: "success",
    topup: "primary",
    back: "danger",
    profile: "primary",
    trialConfirm: "success",
    lang: "primary",
    currency: "primary",
};
function parseBotInnerButtonStyles(raw) {
    if (!raw || !raw.trim())
        return { ...DEFAULT_BOT_INNER_BUTTON_STYLES };
    try {
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== "object")
            return { ...DEFAULT_BOT_INNER_BUTTON_STYLES };
        const out = { ...DEFAULT_BOT_INNER_BUTTON_STYLES };
        for (const k of Object.keys(DEFAULT_BOT_INNER_BUTTON_STYLES)) {
            if (typeof parsed[k] === "string" && ["primary", "success", "danger", ""].includes(parsed[k])) {
                out[k] = parsed[k]; // сохраняем "" как «без стиля», не подменяем дефолтом
            }
        }
        return out;
    }
    catch {
        return { ...DEFAULT_BOT_INNER_BUTTON_STYLES };
    }
}
function parseBotMenuTexts(raw) {
    if (!raw || !raw.trim())
        return { ...DEFAULT_BOT_MENU_TEXTS };
    try {
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== "object")
            return { ...DEFAULT_BOT_MENU_TEXTS };
        const out = { ...DEFAULT_BOT_MENU_TEXTS };
        for (const k of Object.keys(DEFAULT_BOT_MENU_TEXTS)) {
            if (typeof parsed[k] === "string")
                out[k] = parsed[k];
        }
        return out;
    }
    catch {
        return { ...DEFAULT_BOT_MENU_TEXTS };
    }
}
function parseBotTariffsText(raw) {
    if (!raw || !raw.trim())
        return DEFAULT_BOT_TARIFFS_TEXT;
    return raw;
}
function parseBotPaymentText(raw) {
    if (!raw || !raw.trim())
        return DEFAULT_BOT_PAYMENT_TEXT;
    return raw;
}
function parseBotTariffLineFields(raw) {
    if (!raw || !raw.trim())
        return { ...DEFAULT_BOT_TARIFF_LINE_FIELDS };
    try {
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== "object")
            return { ...DEFAULT_BOT_TARIFF_LINE_FIELDS };
        const out = { ...DEFAULT_BOT_TARIFF_LINE_FIELDS };
        for (const k of Object.keys(DEFAULT_BOT_TARIFF_LINE_FIELDS)) {
            if (typeof parsed[k] === "boolean")
                out[k] = parsed[k];
        }
        return out;
    }
    catch {
        return { ...DEFAULT_BOT_TARIFF_LINE_FIELDS };
    }
}
function parseBotMenuLineVisibility(raw) {
    if (!raw || !raw.trim())
        return { ...DEFAULT_BOT_MENU_LINE_VISIBILITY };
    try {
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== "object")
            return { ...DEFAULT_BOT_MENU_LINE_VISIBILITY };
        const out = { ...DEFAULT_BOT_MENU_LINE_VISIBILITY };
        for (const k of Object.keys(DEFAULT_BOT_MENU_LINE_VISIBILITY)) {
            if (typeof parsed[k] === "boolean")
                out[k] = parsed[k];
        }
        return out;
    }
    catch {
        return { ...DEFAULT_BOT_MENU_LINE_VISIBILITY };
    }
}
function parseBotButtons(raw) {
    if (!raw || !raw.trim())
        return DEFAULT_BOT_BUTTONS;
    try {
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed))
            return DEFAULT_BOT_BUTTONS;
        const result = parsed.map((x, i) => {
            const o = x;
            const id = typeof o.id === "string" ? o.id : String(o.id ?? "button");
            const def = DEFAULT_BOT_BUTTONS.find((d) => d.id === id) ?? { label: id, order: i, style: "" };
            return {
                id,
                visible: typeof o.visible === "boolean" ? o.visible : true,
                label: typeof o.label === "string" && o.label.trim() ? o.label.trim() : def.label,
                order: typeof o.order === "number" ? o.order : (typeof o.order === "string" ? parseFloat(o.order) : i),
                style: typeof o.style === "string" ? o.style : def.style ?? "",
                emojiKey: typeof o.emojiKey === "string" ? o.emojiKey.trim() : undefined,
                onePerRow: typeof o.onePerRow === "boolean" ? o.onePerRow : def.onePerRow,
            };
        });
        // Дополняем кнопками из дефолтов, которых нет в сохранённом списке
        const savedIds = new Set(result.map((b) => b.id));
        for (const def of DEFAULT_BOT_BUTTONS) {
            if (!savedIds.has(def.id)) {
                result.push({ id: def.id, visible: def.visible, label: def.label, order: def.order, style: def.style ?? "", emojiKey: undefined, onePerRow: def.onePerRow });
            }
        }
        return result;
    }
    catch {
        return DEFAULT_BOT_BUTTONS;
    }
}
function parseBotEmojis(raw) {
    if (!raw || !raw.trim())
        return {};
    try {
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== "object")
            return {};
        const out = {};
        for (const [key, val] of Object.entries(parsed)) {
            if (val == null)
                continue;
            if (typeof val === "string" && val.trim()) {
                out[key] = { unicode: val.trim() };
                continue;
            }
            if (typeof val !== "object")
                continue;
            const v = val;
            const unicode = typeof v.unicode === "string" ? v.unicode.trim() : undefined;
            const tgEmojiId = typeof v.tgEmojiId === "string" ? v.tgEmojiId.trim() : (typeof v.tgEmojiId === "number" ? String(v.tgEmojiId) : undefined);
            if (unicode || tgEmojiId)
                out[key] = { unicode, tgEmojiId };
        }
        return out;
    }
    catch {
        return {};
    }
}
export async function getSystemConfig() {
    const settings = await prisma.systemSetting.findMany({
        where: { key: { in: SYSTEM_CONFIG_KEYS } },
    });
    const map = Object.fromEntries(settings.map((s) => [s.key, s.value]));
    const activeLangs = (map.active_languages || "ru,en").split(",").map((s) => s.trim());
    const activeCurrs = (map.active_currencies || "usd,rub").split(",").map((s) => s.trim());
    return {
        activeLanguages: activeLangs,
        activeCurrencies: activeCurrs,
        defaultLanguage: map.default_language && activeLangs.includes(map.default_language) ? map.default_language : activeLangs[0] ?? "ru",
        defaultCurrency: map.default_currency && activeCurrs.includes(map.default_currency) ? map.default_currency : activeCurrs[0] ?? "usd",
        defaultReferralPercent: parseFloat(map.default_referral_percent || "30"),
        referralPercentLevel2: parseFloat(map.referral_percent_level_2 || "10"),
        referralPercentLevel3: parseFloat(map.referral_percent_level_3 || "10"),
        trialDays: parseInt(map.trial_days || "3", 10),
        trialSquadUuid: map.trial_squad_uuid || null,
        trialDeviceLimit: map.trial_device_limit != null && map.trial_device_limit !== "" ? parseInt(map.trial_device_limit, 10) : null,
        trialTrafficLimitBytes: map.trial_traffic_limit != null && map.trial_traffic_limit !== "" ? parseInt(map.trial_traffic_limit, 10) : null,
        serviceName: map.service_name || "STEALTHNET",
        logo: map.logo || null,
        logoBot: map.logo_bot || null,
        favicon: map.favicon || null,
        remnaClientUrl: map.remna_client_url || null,
        smtpHost: map.smtp_host || null,
        smtpPort: map.smtp_port != null && map.smtp_port !== "" ? parseInt(map.smtp_port, 10) : 587,
        smtpSecure: map.smtp_secure === "true" || map.smtp_secure === "1",
        smtpUser: map.smtp_user || null,
        smtpPassword: map.smtp_password || null,
        smtpFromEmail: map.smtp_from_email || null,
        smtpFromName: map.smtp_from_name || null,
        publicAppUrl: map.public_app_url || null,
        telegramBotToken: map.telegram_bot_token || null,
        telegramBotUsername: map.telegram_bot_username || null,
        botAdminTelegramIds: parseBotAdminTelegramIds(map.bot_admin_telegram_ids),
        notificationTelegramGroupId: (map.notification_telegram_group_id ?? "").trim() || null,
        notificationTopicNewClients: (map.notification_topic_new_clients ?? "").trim() || null,
        notificationTopicPayments: (map.notification_topic_payments ?? "").trim() || null,
        notificationTopicTickets: (map.notification_topic_tickets ?? "").trim() || null,
        notificationTopicBackups: (map.notification_topic_backups ?? "").trim() || null,
        autoBackupEnabled: map.auto_backup_enabled === "true" || map.auto_backup_enabled === "1",
        autoBackupCron: (map.auto_backup_cron ?? "").trim() || null,
        plategaMerchantId: map.platega_merchant_id || null,
        plategaSecret: map.platega_secret || null,
        plategaMethods: parsePlategaMethods(map.platega_methods),
        paymentProviders: parsePaymentProviders(map.payment_providers_config),
        gramadsApiKey: (map.gramads_api_key ?? "").trim() || null,
        yoomoneyClientId: map.yoomoney_client_id || null,
        yoomoneyClientSecret: map.yoomoney_client_secret || null,
        yoomoneyReceiverWallet: map.yoomoney_receiver_wallet || null,
        yoomoneyNotificationSecret: map.yoomoney_notification_secret || null,
        yookassaShopId: map.yookassa_shop_id || null,
        yookassaSecretKey: map.yookassa_secret_key || null,
        cryptopayApiToken: (map.cryptopay_api_token ?? "").trim() || null,
        cryptopayTestnet: map.cryptopay_testnet === "true" || map.cryptopay_testnet === "1",
        heleketMerchantId: (map.heleket_merchant_id ?? "").trim() || null,
        heleketApiKey: (map.heleket_api_key ?? "").trim() || null,
        groqApiKey: (map.groq_api_key ?? "").trim() || null,
        groqModel: (map.groq_model ?? "").trim() || "llama3-8b-8192",
        groqFallback1: (map.groq_fallback_1 ?? "").trim() || null,
        groqFallback2: (map.groq_fallback_2 ?? "").trim() || null,
        groqFallback3: (map.groq_fallback_3 ?? "").trim() || null,
        aiSystemPrompt: map.ai_system_prompt || "Ты — лучший менеджер техподдержки VPN-сервиса. Твоя цель — вежливо, быстро и точно помогать пользователям с настройкой VPN, тарифами и решением технических проблем. Отвечай кратко и по делу.",
        skipEmailVerification: map.skip_email_verification === "true" || map.skip_email_verification === "1",
        useRemnaSubscriptionPage: map.use_remna_subscription_page === "true" || map.use_remna_subscription_page === "1",
        aiChatEnabled: map.ai_chat_enabled !== "false" && map.ai_chat_enabled !== "0",
        customBuildEnabled: map.custom_build_enabled === "true" || map.custom_build_enabled === "1",
        customBuildPricePerDay: parseFloat(map.custom_build_price_per_day || "0") || 0,
        customBuildPricePerDevice: parseFloat(map.custom_build_price_per_device || "0") || 0,
        customBuildTrafficMode: (map.custom_build_traffic_mode || "unlimited").trim() === "per_gb" ? "per_gb" : "unlimited",
        customBuildPricePerGb: parseFloat(map.custom_build_price_per_gb || "0") || 0,
        customBuildSquadUuid: (map.custom_build_squad_uuid || "").trim() || null,
        customBuildCurrency: (map.custom_build_currency || "rub").trim().toLowerCase() || "rub",
        customBuildMaxDays: Math.min(360, Math.max(1, parseInt(map.custom_build_max_days || "360", 10) || 360)),
        customBuildMaxDevices: Math.min(20, Math.max(1, parseInt(map.custom_build_max_devices || "10", 10) || 10)),
        googleLoginEnabled: map.google_login_enabled === "true" || map.google_login_enabled === "1",
        googleClientId: (map.google_client_id ?? "").trim() || null,
        googleClientSecret: (map.google_client_secret ?? "").trim() || null,
        appleLoginEnabled: map.apple_login_enabled === "true" || map.apple_login_enabled === "1",
        appleClientId: (map.apple_client_id ?? "").trim() || null,
        appleTeamId: (map.apple_team_id ?? "").trim() || null,
        appleKeyId: (map.apple_key_id ?? "").trim() || null,
        applePrivateKey: (map.apple_private_key ?? "").trim() || null,
        botButtons: parseBotButtons(map.bot_buttons),
        botButtonsPerRow: map.bot_buttons_per_row === "2" ? 2 : 1,
        botEmojis: parseBotEmojis(map.bot_emojis),
        botBackLabel: (map.bot_back_label || "◀️ В меню").trim() || "◀️ В меню",
        botMenuTexts: parseBotMenuTexts(map.bot_menu_texts),
        botMenuLineVisibility: parseBotMenuLineVisibility(map.bot_menu_line_visibility),
        botInnerButtonStyles: parseBotInnerButtonStyles(map.bot_inner_button_styles),
        botTariffsText: parseBotTariffsText(map.bot_tariffs_text),
        botTariffsFields: parseBotTariffLineFields(map.bot_tariffs_fields),
        botPaymentText: parseBotPaymentText(map.bot_payment_text),
        categoryEmojis: parseCategoryEmojis(map.category_emojis),
        subscriptionPageConfig: map.subscription_page_config ?? null,
        defaultAutoRenewEnabled: map.default_auto_renew_enabled === "true" || map.default_auto_renew_enabled === "1",
        autoRenewDaysBeforeExpiry: parseInt(map.auto_renew_days_before_expiry ?? "1", 10) || 1,
        autoRenewNotifyDaysBefore: parseInt(map.auto_renew_notify_days_before ?? "3", 10) || 3,
        autoRenewGracePeriodDays: parseInt(map.auto_renew_grace_period_days ?? "2", 10) || 2,
        autoRenewMaxRetries: parseInt(map.auto_renew_max_retries ?? "3", 10) || 3,
        yookassaRecurringEnabled: map.yookassa_recurring_enabled === "true" || map.yookassa_recurring_enabled === "1",
        supportLink: (map.support_link ?? "").trim() || null,
        agreementLink: (map.agreement_link ?? "").trim() || null,
        offerLink: (map.offer_link ?? "").trim() || null,
        instructionsLink: (map.instructions_link ?? "").trim() || null,
        videoInstructionsEnabled: map.video_instructions_enabled === "true" || map.video_instructions_enabled === "1",
        videoInstructions: (() => {
            try {
                return JSON.parse(map.video_instructions || "[]");
            }
            catch {
                return [];
            }
        })(),
        ticketsEnabled: map.tickets_enabled === "true" || map.tickets_enabled === "1",
        themeAccent: (map.theme_accent ?? "").trim() || "default",
        allowUserThemeChange: map.allow_user_theme_change === "true" || map.allow_user_theme_change === "1" || map.allow_user_theme_change == null,
        forceSubscribeEnabled: map.force_subscribe_enabled === "true" || map.force_subscribe_enabled === "1",
        forceSubscribeChannelId: (map.force_subscribe_channel_id ?? "").trim() || null,
        forceSubscribeMessage: (map.force_subscribe_message ?? "").trim() || null,
        blacklistEnabled: map.blacklist_enabled === "true" || map.blacklist_enabled === "1",
        sellOptionsEnabled: map.sell_options_enabled === "true" || map.sell_options_enabled === "1",
        sellOptionsTrafficEnabled: map.sell_options_traffic_enabled === "true" || map.sell_options_traffic_enabled === "1",
        sellOptionsTrafficProducts: parseSellOptionTrafficProducts(map.sell_options_traffic_products),
        sellOptionsDevicesEnabled: map.sell_options_devices_enabled === "true" || map.sell_options_devices_enabled === "1",
        sellOptionsDevicesProducts: parseSellOptionDeviceProducts(map.sell_options_devices_products),
        sellOptionsServersEnabled: map.sell_options_servers_enabled === "true" || map.sell_options_servers_enabled === "1",
        sellOptionsServersProducts: parseSellOptionServerProducts(map.sell_options_servers_products),
        googleAnalyticsId: (map.google_analytics_id ?? "").trim() || null,
        yandexMetrikaId: (map.yandex_metrika_id ?? "").trim() || null,
        autoBroadcastCron: (map.auto_broadcast_cron ?? "").trim() || null,
        adminFrontNotificationsEnabled: map.admin_front_notifications_enabled === "true" || map.admin_front_notifications_enabled === "1",
        landingEnabled: map.landing_enabled === "true" || map.landing_enabled === "1",
        landingHeroTitle: (map.landing_hero_title ?? "").trim() || null,
        landingHeroSubtitle: (map.landing_hero_subtitle ?? "").trim() || null,
        landingHeroCtaText: (map.landing_hero_cta_text ?? "").trim() || "В кабинет",
        landingHeroBadge: (map.landing_hero_badge ?? "").trim() || null,
        landingHeroHint: (map.landing_hero_hint ?? "").trim() || null,
        landingShowTariffs: map.landing_show_tariffs !== "false" && map.landing_show_tariffs !== "0",
        landingContacts: (map.landing_contacts ?? "").trim() || null,
        landingFeature1Label: (map.landing_feature_1_label ?? "").trim() || null,
        landingFeature1Sub: (map.landing_feature_1_sub ?? "").trim() || null,
        landingFeature2Label: (map.landing_feature_2_label ?? "").trim() || null,
        landingFeature2Sub: (map.landing_feature_2_sub ?? "").trim() || null,
        landingFeature3Label: (map.landing_feature_3_label ?? "").trim() || null,
        landingFeature3Sub: (map.landing_feature_3_sub ?? "").trim() || null,
        landingFeature4Label: (map.landing_feature_4_label ?? "").trim() || null,
        landingFeature4Sub: (map.landing_feature_4_sub ?? "").trim() || null,
        landingFeature5Label: (map.landing_feature_5_label ?? "").trim() || null,
        landingFeature5Sub: (map.landing_feature_5_sub ?? "").trim() || null,
        landingBenefitsTitle: (map.landing_benefits_title ?? "").trim() || null,
        landingBenefitsSubtitle: (map.landing_benefits_subtitle ?? "").trim() || null,
        landingBenefit1Title: (map.landing_benefit_1_title ?? "").trim() || null,
        landingBenefit1Desc: (map.landing_benefit_1_desc ?? "").trim() || null,
        landingBenefit2Title: (map.landing_benefit_2_title ?? "").trim() || null,
        landingBenefit2Desc: (map.landing_benefit_2_desc ?? "").trim() || null,
        landingBenefit3Title: (map.landing_benefit_3_title ?? "").trim() || null,
        landingBenefit3Desc: (map.landing_benefit_3_desc ?? "").trim() || null,
        landingBenefit4Title: (map.landing_benefit_4_title ?? "").trim() || null,
        landingBenefit4Desc: (map.landing_benefit_4_desc ?? "").trim() || null,
        landingBenefit5Title: (map.landing_benefit_5_title ?? "").trim() || null,
        landingBenefit5Desc: (map.landing_benefit_5_desc ?? "").trim() || null,
        landingBenefit6Title: (map.landing_benefit_6_title ?? "").trim() || null,
        landingBenefit6Desc: (map.landing_benefit_6_desc ?? "").trim() || null,
        landingTariffsTitle: (map.landing_tariffs_title ?? "").trim() || null,
        landingTariffsSubtitle: (map.landing_tariffs_subtitle ?? "").trim() || null,
        landingDevicesTitle: (map.landing_devices_title ?? "").trim() || null,
        landingDevicesSubtitle: (map.landing_devices_subtitle ?? "").trim() || null,
        landingFaqTitle: (map.landing_faq_title ?? "").trim() || null,
        landingFaqJson: (map.landing_faq_json ?? "").trim() || null,
        landingOfferLink: (map.landing_offer_link ?? "").trim() || null,
        landingPrivacyLink: (map.landing_privacy_link ?? "").trim() || null,
        landingFooterText: (map.landing_footer_text ?? "").trim() || null,
        landingHeroHeadline1: (map.landing_hero_headline_1 ?? "").trim() || null,
        landingHeroHeadline2: (map.landing_hero_headline_2 ?? "").trim() || null,
        landingHeaderBadge: (map.landing_header_badge ?? "").trim() || null,
        landingButtonLogin: (map.landing_button_login ?? "").trim() || null,
        landingButtonLoginCabinet: (map.landing_button_login_cabinet ?? "").trim() || null,
        landingNavBenefits: (map.landing_nav_benefits ?? "").trim() || null,
        landingNavTariffs: (map.landing_nav_tariffs ?? "").trim() || null,
        landingNavDevices: (map.landing_nav_devices ?? "").trim() || null,
        landingNavFaq: (map.landing_nav_faq ?? "").trim() || null,
        landingBenefitsBadge: (map.landing_benefits_badge ?? "").trim() || null,
        landingDefaultPaymentText: (map.landing_default_payment_text ?? "").trim() || null,
        landingButtonChooseTariff: (map.landing_button_choose_tariff ?? "").trim() || null,
        landingNoTariffsMessage: (map.landing_no_tariffs_message ?? "").trim() || null,
        landingButtonWatchTariffs: (map.landing_button_watch_tariffs ?? "").trim() || null,
        landingButtonStart: (map.landing_button_start ?? "").trim() || null,
        landingButtonOpenCabinet: (map.landing_button_open_cabinet ?? "").trim() || null,
        landingJourneyStepsJson: (map.landing_journey_steps_json ?? "").trim() || null,
        landingSignalCardsJson: (map.landing_signal_cards_json ?? "").trim() || null,
        landingTrustPointsJson: (map.landing_trust_points_json ?? "").trim() || null,
        landingExperiencePanelsJson: (map.landing_experience_panels_json ?? "").trim() || null,
        landingDevicesListJson: (map.landing_devices_list_json ?? "").trim() || null,
        landingQuickStartJson: (map.landing_quick_start_json ?? "").trim() || null,
        landingInfraTitle: (map.landing_infra_title ?? "").trim() || null,
        landingNetworkCockpitText: (map.landing_network_cockpit_text ?? "").trim() || null,
        landingPulseTitle: (map.landing_pulse_title ?? "").trim() || null,
        landingComfortTitle: (map.landing_comfort_title ?? "").trim() || null,
        landingComfortBadge: (map.landing_comfort_badge ?? "").trim() || null,
        landingPrinciplesTitle: (map.landing_principles_title ?? "").trim() || null,
        landingTechTitle: (map.landing_tech_title ?? "").trim() || null,
        landingTechDesc: (map.landing_tech_desc ?? "").trim() || null,
        landingCategorySubtitle: (map.landing_category_subtitle ?? "").trim() || null,
        landingTariffDefaultDesc: (map.landing_tariff_default_desc ?? "").trim() || null,
        landingTariffBullet1: (map.landing_tariff_bullet_1 ?? "").trim() || null,
        landingTariffBullet2: (map.landing_tariff_bullet_2 ?? "").trim() || null,
        landingTariffBullet3: (map.landing_tariff_bullet_3 ?? "").trim() || null,
        landingLowestTariffDesc: (map.landing_lowest_tariff_desc ?? "").trim() || null,
        landingDevicesCockpitText: (map.landing_devices_cockpit_text ?? "").trim() || null,
        landingUniversalityTitle: (map.landing_universality_title ?? "").trim() || null,
        landingUniversalityDesc: (map.landing_universality_desc ?? "").trim() || null,
        landingQuickSetupTitle: (map.landing_quick_setup_title ?? "").trim() || null,
        landingQuickSetupDesc: (map.landing_quick_setup_desc ?? "").trim() || null,
        landingPremiumServiceTitle: (map.landing_premium_service_title ?? "").trim() || null,
        landingPremiumServicePara1: (map.landing_premium_service_para1 ?? "").trim() || null,
        landingPremiumServicePara2: (map.landing_premium_service_para2 ?? "").trim() || null,
        landingHowItWorksTitle: (map.landing_how_it_works_title ?? "").trim() || null,
        landingHowItWorksDesc: (map.landing_how_it_works_desc ?? "").trim() || null,
        landingStatsPlatforms: (map.landing_stats_platforms ?? "").trim() || null,
        landingStatsTariffsLabel: (map.landing_stats_tariffs_label ?? "").trim() || null,
        landingStatsAccessLabel: (map.landing_stats_access_label ?? "").trim() || null,
        landingStatsPaymentMethods: (map.landing_stats_payment_methods ?? "").trim() || null,
        landingReadyToConnectEyebrow: (map.landing_ready_to_connect_eyebrow ?? "").trim() || null,
        landingReadyToConnectTitle: (map.landing_ready_to_connect_title ?? "").trim() || null,
        landingReadyToConnectDesc: (map.landing_ready_to_connect_desc ?? "").trim() || null,
        landingShowFeatures: map.landing_show_features !== "false" && map.landing_show_features !== "0",
        landingShowBenefits: map.landing_show_benefits !== "false" && map.landing_show_benefits !== "0",
        landingShowDevices: map.landing_show_devices !== "false" && map.landing_show_devices !== "0",
        landingShowFaq: map.landing_show_faq !== "false" && map.landing_show_faq !== "0",
        landingShowHowItWorks: map.landing_show_how_it_works !== "false" && map.landing_show_how_it_works !== "0",
        landingShowCta: map.landing_show_cta !== "false" && map.landing_show_cta !== "0",
        proxyEnabled: map.proxy_enabled === "true" || map.proxy_enabled === "1",
        proxyUrl: (map.proxy_url ?? "").trim() || null,
        proxyTelegram: map.proxy_telegram === "true" || map.proxy_telegram === "1",
        proxyPayments: map.proxy_payments === "true" || map.proxy_payments === "1",
        nalogEnabled: map.nalog_enabled === "true" || map.nalog_enabled === "1",
        nalogInn: (map.nalog_inn ?? "").trim() || null,
        nalogPassword: (map.nalog_password ?? "").trim() || null,
        nalogDeviceId: (map.nalog_device_id ?? "").trim() || null,
        nalogServiceName: (map.nalog_service_name ?? "").trim() || null,
        geoMapEnabled: map.geo_map_enabled === "true" || map.geo_map_enabled === "1",
        geoCacheTtl: parseInt(map.geo_cache_ttl || "60", 10) || 60,
        maxmindDbPath: (map.maxmind_db_path ?? "").trim() || null,
        giftSubscriptionsEnabled: map.gift_subscriptions_enabled === "true" || map.gift_subscriptions_enabled === "1",
        giftCodeExpiryHours: parseInt(map.gift_code_expiry_hours || "72", 10) || 72,
        maxAdditionalSubscriptions: parseInt(map.max_additional_subscriptions || "5", 10) || 5,
        giftCodeFormatLength: parseInt(map.gift_code_format_length || "12", 10) || 12,
        giftRateLimitPerMinute: parseInt(map.gift_rate_limit_per_minute || "5", 10) || 5,
        giftExpiryNotificationDays: parseInt(map.gift_expiry_notification_days || "3", 10) || 3,
        giftReferralEnabled: map.gift_referral_enabled !== "false" && map.gift_referral_enabled !== "0",
        giftMessageMaxLength: parseInt(map.gift_message_max_length || "200", 10) || 200,
    };
}
function parseBotAdminTelegramIds(raw) {
    if (!raw || !raw.trim())
        return [];
    try {
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed))
            return [];
        return parsed.filter((x) => typeof x === "string" && /^\d+$/.test(x.trim())).map((x) => x.trim());
    }
    catch {
        return [];
    }
}
function parseCategoryEmojis(raw) {
    if (!raw || !raw.trim())
        return { ordinary: "📦", premium: "⭐" };
    try {
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== "object")
            return { ordinary: "📦", premium: "⭐" };
        const out = {};
        for (const [k, v] of Object.entries(parsed)) {
            if (typeof v === "string" && v.trim())
                out[k] = v.trim();
        }
        if (Object.keys(out).length === 0)
            return { ordinary: "📦", premium: "⭐" };
        return out;
    }
    catch {
        return { ordinary: "📦", premium: "⭐" };
    }
}
const DEFAULT_PLATEGA_METHODS = [
    { id: 2, enabled: true, label: "СПБ" },
    { id: 11, enabled: false, label: "Карты" },
    { id: 12, enabled: false, label: "Международный" },
    { id: 13, enabled: false, label: "Криптовалюта" },
];
const DEFAULT_PAYMENT_PROVIDERS = [
    { id: "cryptopay", label: "Crypto Bot", sortOrder: 0 },
    { id: "heleket", label: "Heleket", sortOrder: 1 },
    { id: "yookassa", label: "ЮKassa (СБП / Карты)", sortOrder: 2 },
    { id: "yoomoney", label: "ЮMoney (Карты)", sortOrder: 3 },
];
function parsePaymentProviders(raw) {
    if (!raw || !raw.trim())
        return DEFAULT_PAYMENT_PROVIDERS;
    try {
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed))
            return DEFAULT_PAYMENT_PROVIDERS;
        const result = parsed.map((m, i) => {
            const x = m;
            return {
                id: typeof x.id === "string" ? x.id : `unknown_${i}`,
                label: typeof x.label === "string" ? x.label : String(x.id ?? ""),
                sortOrder: typeof x.sortOrder === "number" ? x.sortOrder : i,
            };
        });
        const knownIds = new Set(result.map((r) => r.id));
        for (const def of DEFAULT_PAYMENT_PROVIDERS) {
            if (!knownIds.has(def.id))
                result.push({ ...def, sortOrder: result.length });
        }
        result.sort((a, b) => a.sortOrder - b.sortOrder);
        return result;
    }
    catch {
        return DEFAULT_PAYMENT_PROVIDERS;
    }
}
function parsePlategaMethods(raw) {
    if (!raw || !raw.trim())
        return DEFAULT_PLATEGA_METHODS;
    try {
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed))
            return DEFAULT_PLATEGA_METHODS;
        return parsed.map((m) => {
            const x = m;
            return {
                id: typeof x.id === "number" ? x.id : Number(x.id) || 2,
                enabled: Boolean(x.enabled),
                label: typeof x.label === "string" ? x.label : String(x.id),
            };
        });
    }
    catch {
        return DEFAULT_PLATEGA_METHODS;
    }
}
function parseSellOptionTrafficProducts(raw) {
    if (!raw?.trim())
        return [];
    try {
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed))
            return [];
        return parsed
            .filter((x) => x != null && typeof x === "object")
            .map((x, i) => ({
            id: typeof x.id === "string" ? x.id : `traffic_${i}`,
            name: typeof x.name === "string" ? x.name : `+${x.trafficGb ?? 0} ГБ`,
            trafficGb: typeof x.trafficGb === "number" ? x.trafficGb : Number(x.trafficGb) || 0,
            price: typeof x.price === "number" ? x.price : Number(x.price) || 0,
            currency: typeof x.currency === "string" ? x.currency : "rub",
        }))
            .filter((p) => p.trafficGb > 0 && p.price >= 0);
    }
    catch {
        return [];
    }
}
function parseSellOptionDeviceProducts(raw) {
    if (!raw?.trim())
        return [];
    try {
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed))
            return [];
        return parsed
            .filter((x) => x != null && typeof x === "object")
            .map((x, i) => ({
            id: typeof x.id === "string" ? x.id : `devices_${i}`,
            name: typeof x.name === "string" ? x.name : `+${x.deviceCount ?? 0} устр.`,
            deviceCount: typeof x.deviceCount === "number" ? x.deviceCount : Number(x.deviceCount) || 0,
            price: typeof x.price === "number" ? x.price : Number(x.price) || 0,
            currency: typeof x.currency === "string" ? x.currency : "rub",
        }))
            .filter((p) => p.deviceCount > 0 && p.price >= 0);
    }
    catch {
        return [];
    }
}
function parseSellOptionServerProducts(raw) {
    if (!raw?.trim())
        return [];
    try {
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed))
            return [];
        return parsed
            .filter((x) => x != null && typeof x === "object")
            .map((x, i) => ({
            id: typeof x.id === "string" ? x.id : `server_${i}`,
            name: typeof x.name === "string" ? x.name : "Доп. сервер",
            squadUuid: typeof x.squadUuid === "string" ? x.squadUuid : "",
            trafficGb: typeof x.trafficGb === "number" && x.trafficGb >= 0 ? x.trafficGb : (typeof x.trafficGb !== "undefined" ? Number(x.trafficGb) || 0 : 0),
            price: typeof x.price === "number" ? x.price : Number(x.price) || 0,
            currency: typeof x.currency === "string" ? x.currency : "rub",
        }))
            .filter((p) => p.squadUuid.length > 0 && p.price >= 0);
    }
    catch {
        return [];
    }
}
function stripLeadingEmoji(label) {
    return label.replace(/^\p{Extended_Pictographic}\uFE0F?\s*/u, "");
}
/** Публичный конфиг для сайта/бота (без паролей и секретов). botButtons с подставленными эмодзи. */
export async function getPublicConfig() {
    const full = await getSystemConfig();
    const trialDays = full.trialDays ?? 0;
    const trialEnabled = trialDays > 0 && Boolean(full.trialSquadUuid?.trim());
    const botEmojis = full.botEmojis ?? {};
    const defaultEmojiKeyByButtonId = {
        trial: "TRIAL", tariffs: "PACKAGE", profile: "PUZZLE", topup: "CARD", referral: "LINK", vpn: "SERVERS", cabinet: "SERVERS",
        devices: "DEVICES", proxy: "SERVERS", my_proxy: "SERVERS", singbox: "SERVERS", my_singbox: "SERVERS",
        support: "NOTE", tickets: "NOTE", promocode: "STAR", extra_options: "PACKAGE",
    };
    const resolvedButtons = (full.botButtons ?? []).map((b) => {
        const emojiKey = b.emojiKey === "" ? null : (b.emojiKey ?? defaultEmojiKeyByButtonId[b.id]);
        const entry = emojiKey ? botEmojis[emojiKey] : undefined;
        let label = b.label;
        let iconCustomEmojiId;
        if (entry) {
            if (entry.tgEmojiId) {
                iconCustomEmojiId = entry.tgEmojiId;
                label = stripLeadingEmoji(label).trim();
            }
            else if (entry.unicode) {
                const base = stripLeadingEmoji(label).trim();
                label = (entry.unicode + " " + base).trim();
            }
        }
        return { id: b.id, visible: b.visible, label, order: b.order, style: b.style, iconCustomEmojiId, onePerRow: b.onePerRow, emojiKey: emojiKey ?? undefined };
    });
    const menuTexts = full.botMenuTexts ?? DEFAULT_BOT_MENU_TEXTS;
    const menuLineVisibility = full.botMenuLineVisibility ?? DEFAULT_BOT_MENU_LINE_VISIBILITY;
    const resolvedBotMenuTexts = {};
    const menuTextCustomEmojiIds = {};
    /** Дефолтный unicode по ключу эмодзи (для плейсхолдеров и для «премиум по ключу») */
    const emojiKeyFallbacks = {
        CHART: "📊",
        STATUS_ACTIVE: "🟡",
        STATUS_EXPIRED: "🔴",
        STATUS_INACTIVE: "🔴",
        STATUS_LIMITED: "🟡",
        STATUS_DISABLED: "🔴",
        HEADER: "🛡",
        MAIN_MENU: "👋",
        BALANCE: "💰",
        TARIFFS: "💎",
        PACKAGE: "📦",
        DATE: "📅",
        TIME: "⏰",
        DEVICES: "📱",
        TRAFFIC: "📈",
        LINK: "🔗",
    };
    /** Ключи строк меню → ключ эмодзи в botEmojis (как в админке: HEADER, BALANCE и т.д.) */
    const menuKeyToEmojiKey = {
        welcomeTitlePrefix: "HEADER",
        welcomeGreeting: "MAIN_MENU",
        balancePrefix: "BALANCE",
        tariffPrefix: "TARIFFS",
        subscriptionPrefix: "CHART",
        statusActive: "STATUS_ACTIVE",
        statusExpired: "STATUS_EXPIRED",
        statusInactive: "STATUS_INACTIVE",
        statusLimited: "STATUS_LIMITED",
        statusDisabled: "STATUS_DISABLED",
        expirePrefix: "DATE",
        daysLeftPrefix: "TIME",
        devicesLabel: "DEVICES",
        trafficPrefix: "TRAFFIC",
        linkLabel: "LINK",
    };
    for (const [k, v] of Object.entries(menuTexts)) {
        let s = String(v ?? "");
        for (const [ek, ev] of Object.entries(botEmojis)) {
            const placeholder = "{{" + ek + "}}";
            if (s.includes(placeholder)) {
                const repl = (ev.unicode ?? "").trim() || (emojiKeyFallbacks[ek] ?? "");
                s = s.split(placeholder).join(repl).trim();
            }
        }
        for (const [pk, pv] of Object.entries(emojiKeyFallbacks)) {
            const placeholder = "{{" + pk + "}}";
            if (s.includes(placeholder))
                s = s.split(placeholder).join(pv).trim();
        }
        resolvedBotMenuTexts[k] = s;
        // Если строка начинается с unicode эмодзи, у которого есть tgEmojiId — передаём ID для entities
        for (const [ek, ev] of Object.entries(botEmojis)) {
            if (ev.tgEmojiId && ev.unicode && s.startsWith(ev.unicode)) {
                menuTextCustomEmojiIds[k] = ev.tgEmojiId;
                break;
            }
        }
        // Премиум по ключу: для этой строки задан emojiKey (HEADER, BALANCE и т.д.) — подставляем tgEmojiId из botEmojis
        const emojiKey = menuKeyToEmojiKey[k];
        if (!menuTextCustomEmojiIds[k] && emojiKey && botEmojis[emojiKey]?.tgEmojiId) {
            const fallback = emojiKeyFallbacks[emojiKey];
            const unicode = botEmojis[emojiKey].unicode?.trim();
            if (fallback && s.startsWith(fallback))
                menuTextCustomEmojiIds[k] = botEmojis[emojiKey].tgEmojiId;
            else if (unicode && s.startsWith(unicode))
                menuTextCustomEmojiIds[k] = botEmojis[emojiKey].tgEmojiId;
        }
    }
    return {
        activeLanguages: full.activeLanguages,
        activeCurrencies: full.activeCurrencies,
        defaultLanguage: full.defaultLanguage,
        defaultCurrency: full.defaultCurrency,
        serviceName: full.serviceName,
        logo: full.logo,
        logoBot: full.logoBot ?? null,
        favicon: full.favicon,
        remnaClientUrl: full.remnaClientUrl,
        publicAppUrl: full.publicAppUrl,
        telegramBotUsername: full.telegramBotUsername,
        telegramBotId: full.telegramBotToken?.split(":")[0] || null,
        botAdminTelegramIds: full.botAdminTelegramIds ?? [],
        plategaMethods: full.plategaMethods.filter((m) => m.enabled).map((m) => ({ id: m.id, label: m.label })),
        yoomoneyEnabled: Boolean(full.yoomoneyReceiverWallet?.trim()),
        yookassaEnabled: Boolean(full.yookassaShopId?.trim() && full.yookassaSecretKey?.trim()),
        yookassaRecurringEnabled: full.yookassaRecurringEnabled ?? false,
        cryptopayEnabled: Boolean(full.cryptopayApiToken?.trim()),
        heleketEnabled: Boolean(full.heleketMerchantId?.trim() && full.heleketApiKey?.trim()),
        paymentProviders: full.paymentProviders,
        skipEmailVerification: full.skipEmailVerification ?? false,
        useRemnaSubscriptionPage: full.useRemnaSubscriptionPage ?? false,
        aiChatEnabled: full.aiChatEnabled ?? true,
        trialEnabled,
        trialDays,
        botButtons: resolvedButtons,
        botButtonsPerRow: full.botButtonsPerRow ?? 1,
        botBackLabel: full.botBackLabel,
        botMenuTexts: menuTexts,
        botMenuLineVisibility: menuLineVisibility,
        resolvedBotMenuTexts,
        menuTextCustomEmojiIds,
        botEmojis,
        botInnerButtonStyles: full.botInnerButtonStyles ?? DEFAULT_BOT_INNER_BUTTON_STYLES,
        botTariffsText: full.botTariffsText ?? DEFAULT_BOT_TARIFFS_TEXT,
        botTariffsFields: full.botTariffsFields ?? DEFAULT_BOT_TARIFF_LINE_FIELDS,
        botPaymentText: full.botPaymentText ?? DEFAULT_BOT_PAYMENT_TEXT,
        categoryEmojis: full.categoryEmojis,
        defaultReferralPercent: full.defaultReferralPercent ?? 0,
        referralPercentLevel2: full.referralPercentLevel2 ?? 0,
        referralPercentLevel3: full.referralPercentLevel3 ?? 0,
        supportLink: full.supportLink ?? null,
        agreementLink: full.agreementLink ?? null,
        offerLink: full.offerLink ?? null,
        instructionsLink: full.instructionsLink ?? null,
        videoInstructionsEnabled: full.videoInstructionsEnabled ?? false,
        videoInstructions: full.videoInstructionsEnabled ? (full.videoInstructions ?? []) : [],
        ticketsEnabled: full.ticketsEnabled ?? false,
        themeAccent: full.themeAccent ?? "default",
        allowUserThemeChange: full.allowUserThemeChange ?? true,
        googleAnalyticsId: full.googleAnalyticsId ?? null,
        yandexMetrikaId: full.yandexMetrikaId ?? null,
        forceSubscribeEnabled: full.forceSubscribeEnabled ?? false,
        forceSubscribeChannelId: full.forceSubscribeChannelId ?? null,
        forceSubscribeMessage: full.forceSubscribeMessage ?? null,
        blacklistEnabled: full.blacklistEnabled ?? false,
        showProxyEnabled: await prisma.proxyTariff.count({ where: { enabled: true } }).then((n) => n > 0),
        showSingboxEnabled: await prisma.singboxTariff.count({ where: { enabled: true } }).then((n) => n > 0),
        sellOptionsEnabled: (() => {
            const so = full;
            if (so.sellOptionsEnabled !== true)
                return false;
            const hasTraffic = so.sellOptionsTrafficEnabled && (so.sellOptionsTrafficProducts?.length ?? 0) > 0;
            const hasDevices = so.sellOptionsDevicesEnabled && (so.sellOptionsDevicesProducts?.length ?? 0) > 0;
            const hasServers = so.sellOptionsServersEnabled && (so.sellOptionsServersProducts?.length ?? 0) > 0;
            return hasTraffic || hasDevices || hasServers;
        })(),
        sellOptions: (() => {
            const so = full;
            if (!so.sellOptionsEnabled)
                return [];
            const out = [];
            if (so.sellOptionsTrafficEnabled && so.sellOptionsTrafficProducts?.length) {
                for (const p of so.sellOptionsTrafficProducts) {
                    out.push({ kind: "traffic", id: p.id, name: p.name, trafficGb: p.trafficGb, price: p.price, currency: p.currency });
                }
            }
            if (so.sellOptionsDevicesEnabled && so.sellOptionsDevicesProducts?.length) {
                for (const p of so.sellOptionsDevicesProducts) {
                    out.push({ kind: "devices", id: p.id, name: p.name, deviceCount: p.deviceCount, price: p.price, currency: p.currency });
                }
            }
            if (so.sellOptionsServersEnabled && so.sellOptionsServersProducts?.length) {
                for (const p of so.sellOptionsServersProducts) {
                    out.push({ kind: "servers", id: p.id, name: p.name, squadUuid: p.squadUuid, trafficGb: p.trafficGb ?? 0, price: p.price, currency: p.currency });
                }
            }
            return out;
        })(),
        googleLoginEnabled: full.googleLoginEnabled && Boolean(full.googleClientId),
        googleClientId: full.googleLoginEnabled && full.googleClientId ? full.googleClientId : null,
        appleLoginEnabled: full.appleLoginEnabled && Boolean(full.appleClientId),
        appleClientId: full.appleLoginEnabled && full.appleClientId ? full.appleClientId : null,
        customBuildConfig: (() => {
            const cb = full;
            if (!cb.customBuildEnabled || !cb.customBuildSquadUuid?.trim())
                return null;
            return {
                enabled: true,
                pricePerDay: cb.customBuildPricePerDay ?? 0,
                pricePerDevice: cb.customBuildPricePerDevice ?? 0,
                trafficMode: cb.customBuildTrafficMode === "per_gb" ? "per_gb" : "unlimited",
                pricePerGb: cb.customBuildPricePerGb ?? 0,
                squadUuid: cb.customBuildSquadUuid.trim(),
                currency: (cb.customBuildCurrency || "rub").toLowerCase(),
                maxDays: Math.min(360, Math.max(1, cb.customBuildMaxDays ?? 360)),
                maxDevices: Math.min(20, Math.max(1, cb.customBuildMaxDevices ?? 10)),
            };
        })(),
        landingEnabled: full.landingEnabled ?? false,
        landingConfig: (() => {
            const l = full;
            if (!l.landingEnabled)
                return null;
            const parseJsonArray = (raw, guard) => {
                if (!raw?.trim())
                    return [];
                try {
                    const a = JSON.parse(raw);
                    return Array.isArray(a) ? a.filter(guard) : [];
                }
                catch {
                    return [];
                }
            };
            const journeySteps = parseJsonArray(l.landingJourneyStepsJson, (x) => typeof x === "object" && x !== null && typeof x.title === "string" && typeof x.desc === "string");
            const signalCards = parseJsonArray(l.landingSignalCardsJson, (x) => typeof x === "object" && x !== null && typeof x.title === "string" && typeof x.desc === "string");
            const trustPoints = parseJsonArray(l.landingTrustPointsJson, (x) => typeof x === "string");
            const experiencePanels = parseJsonArray(l.landingExperiencePanelsJson, (x) => typeof x === "object" && x !== null && typeof x.title === "string" && typeof x.desc === "string");
            const devicesList = parseJsonArray(l.landingDevicesListJson, (x) => typeof x === "object" && x !== null && typeof x.name === "string").map((d) => d.name);
            const quickStartList = parseJsonArray(l.landingQuickStartJson, (x) => typeof x === "string");
            const buildFeatures = () => {
                const items = [];
                const pairs = [
                    [l.landingFeature1Label, l.landingFeature1Sub],
                    [l.landingFeature2Label, l.landingFeature2Sub],
                    [l.landingFeature3Label, l.landingFeature3Sub],
                    [l.landingFeature4Label, l.landingFeature4Sub],
                    [l.landingFeature5Label, l.landingFeature5Sub],
                ];
                for (const [label, sub] of pairs) {
                    const lb = (label ?? "").trim();
                    const sb = (sub ?? "").trim();
                    if (lb || sb)
                        items.push({ label: lb || "—", sub: sb });
                }
                return items;
            };
            const buildBenefits = () => {
                const items = [];
                const pairs = [
                    [l.landingBenefit1Title, l.landingBenefit1Desc],
                    [l.landingBenefit2Title, l.landingBenefit2Desc],
                    [l.landingBenefit3Title, l.landingBenefit3Desc],
                    [l.landingBenefit4Title, l.landingBenefit4Desc],
                    [l.landingBenefit5Title, l.landingBenefit5Desc],
                    [l.landingBenefit6Title, l.landingBenefit6Desc],
                ];
                for (const [t, d] of pairs) {
                    const title = (t ?? "").trim();
                    const desc = (d ?? "").trim();
                    if (title || desc)
                        items.push({ title: title || "—", desc: desc || "" });
                }
                return items;
            };
            const parseFaq = () => {
                if (!l.landingFaqJson)
                    return null;
                try {
                    const a = JSON.parse(l.landingFaqJson);
                    if (!Array.isArray(a))
                        return null;
                    return a.filter((x) => typeof x === "object" && x !== null && typeof x.q === "string" && typeof x.a === "string").map((x) => ({ q: String(x.q), a: String(x.a) }));
                }
                catch {
                    return null;
                }
            };
            return {
                heroTitle: l.landingHeroTitle?.trim() || full.serviceName || "VPN",
                heroSubtitle: l.landingHeroSubtitle?.trim() || null,
                heroCtaText: (l.landingHeroCtaText ?? "").trim() || "В кабинет",
                heroBadge: (l.landingHeroBadge ?? "").trim() || null,
                heroHint: (l.landingHeroHint ?? "").trim() || null,
                showTariffs: l.landingShowTariffs !== false,
                contacts: ((l.landingContacts ?? "").trim()) || null,
                offerLink: ((l.landingOfferLink ?? "").trim()) || (full.offerLink ?? null),
                privacyLink: ((l.landingPrivacyLink ?? "").trim()) || (full.agreementLink ?? null),
                footerText: (l.landingFooterText ?? "").trim() || null,
                features: buildFeatures(),
                benefitsTitle: (l.landingBenefitsTitle ?? "").trim() || null,
                benefitsSubtitle: (l.landingBenefitsSubtitle ?? "").trim() || null,
                benefits: buildBenefits(),
                tariffsTitle: (l.landingTariffsTitle ?? "").trim() || null,
                tariffsSubtitle: (l.landingTariffsSubtitle ?? "").trim() || null,
                devicesTitle: (l.landingDevicesTitle ?? "").trim() || null,
                devicesSubtitle: (l.landingDevicesSubtitle ?? "").trim() || null,
                faqTitle: (l.landingFaqTitle ?? "").trim() || null,
                faq: parseFaq(),
                heroHeadline1: (l.landingHeroHeadline1 ?? "").trim() || null,
                heroHeadline2: (l.landingHeroHeadline2 ?? "").trim() || null,
                headerBadge: (l.landingHeaderBadge ?? "").trim() || null,
                buttonLogin: (l.landingButtonLogin ?? "").trim() || null,
                buttonLoginCabinet: (l.landingButtonLoginCabinet ?? "").trim() || null,
                navBenefits: (l.landingNavBenefits ?? "").trim() || null,
                navTariffs: (l.landingNavTariffs ?? "").trim() || null,
                navDevices: (l.landingNavDevices ?? "").trim() || null,
                navFaq: (l.landingNavFaq ?? "").trim() || null,
                benefitsBadge: (l.landingBenefitsBadge ?? "").trim() || null,
                defaultPaymentText: (l.landingDefaultPaymentText ?? "").trim() || null,
                buttonChooseTariff: (l.landingButtonChooseTariff ?? "").trim() || null,
                noTariffsMessage: (l.landingNoTariffsMessage ?? "").trim() || null,
                buttonWatchTariffs: (l.landingButtonWatchTariffs ?? "").trim() || null,
                buttonStart: (l.landingButtonStart ?? "").trim() || null,
                buttonOpenCabinet: (l.landingButtonOpenCabinet ?? "").trim() || null,
                journeySteps: journeySteps.length > 0 ? journeySteps : null,
                signalCards: signalCards.length > 0 ? signalCards : null,
                trustPoints: trustPoints.length > 0 ? trustPoints : null,
                experiencePanels: experiencePanels.length > 0 ? experiencePanels : null,
                devicesList: devicesList.length > 0 ? devicesList : null,
                quickStartList: quickStartList.length > 0 ? quickStartList : null,
                infraTitle: (l.landingInfraTitle ?? "").trim() || null,
                networkCockpitText: (l.landingNetworkCockpitText ?? "").trim() || null,
                pulseTitle: (l.landingPulseTitle ?? "").trim() || null,
                comfortTitle: (l.landingComfortTitle ?? "").trim() || null,
                comfortBadge: (l.landingComfortBadge ?? "").trim() || null,
                principlesTitle: (l.landingPrinciplesTitle ?? "").trim() || null,
                techTitle: (l.landingTechTitle ?? "").trim() || null,
                techDesc: (l.landingTechDesc ?? "").trim() || null,
                categorySubtitle: (l.landingCategorySubtitle ?? "").trim() || null,
                tariffDefaultDesc: (l.landingTariffDefaultDesc ?? "").trim() || null,
                tariffBullet1: (l.landingTariffBullet1 ?? "").trim() || null,
                tariffBullet2: (l.landingTariffBullet2 ?? "").trim() || null,
                tariffBullet3: (l.landingTariffBullet3 ?? "").trim() || null,
                lowestTariffDesc: (l.landingLowestTariffDesc ?? "").trim() || null,
                devicesCockpitText: (l.landingDevicesCockpitText ?? "").trim() || null,
                universalityTitle: (l.landingUniversalityTitle ?? "").trim() || null,
                universalityDesc: (l.landingUniversalityDesc ?? "").trim() || null,
                quickSetupTitle: (l.landingQuickSetupTitle ?? "").trim() || null,
                quickSetupDesc: (l.landingQuickSetupDesc ?? "").trim() || null,
                premiumServiceTitle: (l.landingPremiumServiceTitle ?? "").trim() || null,
                premiumServicePara1: (l.landingPremiumServicePara1 ?? "").trim() || null,
                premiumServicePara2: (l.landingPremiumServicePara2 ?? "").trim() || null,
                howItWorksTitle: (l.landingHowItWorksTitle ?? "").trim() || null,
                howItWorksDesc: (l.landingHowItWorksDesc ?? "").trim() || null,
                statsPlatforms: (l.landingStatsPlatforms ?? "").trim() || null,
                statsTariffsLabel: (l.landingStatsTariffsLabel ?? "").trim() || null,
                statsAccessLabel: (l.landingStatsAccessLabel ?? "").trim() || null,
                statsPaymentMethods: (l.landingStatsPaymentMethods ?? "").trim() || null,
                readyToConnectEyebrow: (l.landingReadyToConnectEyebrow ?? "").trim() || null,
                readyToConnectTitle: (l.landingReadyToConnectTitle ?? "").trim() || null,
                readyToConnectDesc: (l.landingReadyToConnectDesc ?? "").trim() || null,
                showFeatures: l.landingShowFeatures !== false,
                showBenefits: l.landingShowBenefits !== false,
                showDevices: l.landingShowDevices !== false,
                showFaq: l.landingShowFaq !== false,
                showHowItWorks: l.landingShowHowItWorks !== false,
                showCta: l.landingShowCta !== false,
            };
        })(),
        giftSubscriptionsEnabled: full.giftSubscriptionsEnabled ?? false,
        giftCodeExpiryHours: full.giftCodeExpiryHours ?? 72,
        maxAdditionalSubscriptions: full.maxAdditionalSubscriptions ?? 5,
        giftCodeFormatLength: full.giftCodeFormatLength ?? 12,
        giftRateLimitPerMinute: full.giftRateLimitPerMinute ?? 5,
        giftExpiryNotificationDays: full.giftExpiryNotificationDays ?? 3,
        giftReferralEnabled: full.giftReferralEnabled ?? true,
        giftMessageMaxLength: full.giftMessageMaxLength ?? 200,
        proxyEnabled: full.proxyEnabled ?? false,
        proxyUrl: full.proxyUrl ?? null,
        proxyTelegram: full.proxyTelegram ?? false,
        proxyPayments: full.proxyPayments ?? false,
        translations: await loadAllLanguagePacks(full.activeLanguages),
    };
}
//# sourceMappingURL=client.service.js.map