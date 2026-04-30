/**
 * API для админ-панели в Telegram-боте.
 * Авторизация: X-Telegram-Bot-Token (токен бота) + telegramId (ID админа в Telegram).
 * Доступ только для telegramId из настройки bot_admin_telegram_ids.
 */
declare const botAdminRouter: import("express-serve-static-core").Router;
export { botAdminRouter };
//# sourceMappingURL=bot-admin.routes.d.ts.map