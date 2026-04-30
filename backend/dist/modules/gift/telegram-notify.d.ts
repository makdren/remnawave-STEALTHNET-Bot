/**
 * Утилита для отправки Telegram-уведомлений из backend.
 * Использует BOT_TOKEN из env для прямых вызовов Telegram Bot API.
 */
/**
 * Отправляет сообщение пользователю в Telegram.
 * Если BOT_TOKEN не задан или отправка не удалась — тихо игнорирует (fire-and-forget).
 */
export declare function sendTelegramNotification(telegramId: string | bigint, text: string): Promise<void>;
//# sourceMappingURL=telegram-notify.d.ts.map