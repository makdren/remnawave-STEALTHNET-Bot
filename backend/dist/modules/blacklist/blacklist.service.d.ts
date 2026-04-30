/**
 * Community Blacklist — автоматическая блокировка пользователей
 * из https://github.com/BEDOLAGA-DEV/VPN-BLACKLIST/blob/main/blacklist.txt
 *
 * Список кэшируется в памяти на 30 минут.
 */
export declare function getBlacklistSet(): Promise<Set<string>>;
/**
 * Проверяет telegramId по blacklist.
 * Если найден — ставит isBlocked = true, blockReason = "Community Blacklist".
 * Возвращает true если пользователь заблокирован.
 */
export declare function checkAndBlockIfBlacklisted(telegramId: string): Promise<boolean>;
//# sourceMappingURL=blacklist.service.d.ts.map