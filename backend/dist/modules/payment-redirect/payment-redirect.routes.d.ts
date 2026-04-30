/**
 * Публичный redirect-роут `/api/pay/:orderId`.
 *
 * Зачем: iOS Telegram WebView блокирует/криво рендерит страницы платёжных провайдеров
 * при открытии UrlButton в боте или окне WebApp. Решение — нативный редирект через наш
 * whitelist-нутый домен: бот/фронт дают пользователю URL `https://panel.../api/pay/<id>`,
 * этот роут делает HTTP 302 на реальную ссылку платёжки, Telegram открывает её в Safari.
 */
export declare const paymentRedirectRouter: import("express-serve-static-core").Router;
//# sourceMappingURL=payment-redirect.routes.d.ts.map