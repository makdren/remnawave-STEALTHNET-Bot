/**
 * Сервис дополнительных подписок и подарков (v2).
 *
 * Бизнес-логика:
 * 1. Покупка доп. подписки → создаётся SecondarySubscription + Remnawave-пользователь с суффиксом _1, _2, ...
 * 2. Активировать себе → снять GIFT_RESERVED, подписка появляется на дашборде владельца
 * 3. Подарить → генерируется 12-символьный код XXXX-XXXX-XXXX, подписка скрывается (giftStatus = GIFT_RESERVED)
 * 4. Активировать подарок → подписка переносится на получателя (ownerId → recipient, giftedToClientId → recipient)
 * 5. Отмена / экспирация → подписка возвращается дарителю (giftStatus = null)
 * 6. Удаление подписки → remnaDeleteUser + hard delete SecondarySubscription
 *
 * Все мутации логируются в GiftHistory.
 */
export type GiftResult<T = void> = {
    ok: true;
    data: T;
} | {
    ok: false;
    error: string;
    status: number;
};
export type SecondarySubscriptionData = {
    id: string;
    ownerId: string;
    remnawaveUuid: string | null;
    subscriptionIndex: number;
    tariffId: string | null;
    giftStatus: string | null;
    giftedToClientId: string | null;
    createdAt: Date;
    updatedAt: Date;
};
/**
 * Создаёт дополнительную подписку (SecondarySubscription + Remnawave user).
 * Вызывается ПОСЛЕ успешной оплаты тарифа (из webhook / оплата балансом).
 */
export declare function createAdditionalSubscription(rootClientId: string, tariff: {
    id?: string;
    name?: string;
    price?: number;
    durationDays: number;
    trafficLimitBytes: bigint | null;
    deviceLimit: number | null;
    internalSquadUuids: string[];
    trafficResetMode?: string;
}, options?: {
    skipConfigCheck?: boolean;
}): Promise<GiftResult<{
    secondarySubscriptionId: string;
    subscriptionIndex: number;
}>>;
/**
 * Активирует подписку на себя: снимает GIFT_RESERVED, подписка появляется на дашборде.
 * Для подписки, которую клиент купил и ещё не подарил — просто «оставить себе».
 */
export declare function activateForSelf(ownerId: string, subscriptionId: string): Promise<GiftResult<{
    subscriptionId: string;
}>>;
/**
 * Удалить дополнительную подписку: отменить коды + remnaDeleteUser + hard delete.
 */
export declare function deleteSubscription(ownerId: string, subscriptionId: string): Promise<GiftResult>;
/**
 * Список всех подписок клиента (основная + дополнительные).
 * Скрытые (giftStatus = GIFT_RESERVED) не включаются.
 * Подаренные и уже активированные у текущего клиента (giftStatus = GIFTED) — показываются.
 */
export declare function listClientSubscriptions(rootClientId: string): Promise<GiftResult<SecondarySubscriptionData[]>>;
/**
 * Список ВСЕХ подписок клиента включая GIFT_RESERVED и ACTIVATED_SELF (для страницы управления подарками).
 * ACTIVATED_SELF показываются как «активирована на себя» (без кнопок действий).
 * GIFTED включаются — показываются как «подарена вам» (ownerId перезаписан на получателя).
 */
export declare function listAllClientSubscriptions(rootClientId: string): Promise<GiftResult<SecondarySubscriptionData[]>>;
/**
 * Создаёт код подарка для конкретной дочерней подписки.
 * Помечает подписку как GIFT_RESERVED (скрывает из UI дарителя).
 */
export declare function createGiftCode(rootClientId: string, secondarySubscriptionId: string, giftMessage?: string, options?: {
    skipConfigCheck?: boolean;
}): Promise<GiftResult<{
    code: string;
    expiresAt: Date;
    tariffName: string | null;
}>>;
/**
 * Активирует подарок: переносит подписку на получателя.
 * Создаёт новую SecondarySubscription у получателя, обновляет giftedToClientId.
 */
export declare function redeemGiftCode(recipientRootClientId: string, rawCode: string): Promise<GiftResult<{
    secondarySubscriptionId: string;
    subscriptionIndex: number;
    giftMessage: string | null;
    creatorTelegramId: string | null;
    tariffName: string | null;
}>>;
/**
 * Отменяет подарочный код: снимает резерв, возвращает подписку дарителю.
 */
export declare function cancelGiftCode(rootClientId: string, codeOrId: string): Promise<GiftResult>;
/**
 * Lazy expiration: обрабатывает все просроченные активные коды.
 * Вызывается периодически (или при каждом запросе к списку кодов).
 */
export declare function expireOldGiftCodes(): Promise<number>;
/**
 * Список подарочных кодов, созданных клиентом.
 */
export declare function listGiftCodes(rootClientId: string): Promise<GiftResult<Array<{
    id: string;
    code: string;
    status: string;
    expiresAt: Date;
    createdAt: Date;
    redeemedAt: Date | null;
    giftMessage: string | null;
    secondarySubscriptionId: string;
}>>>;
/**
 * Получает Remnawave subscription URL для конкретной подписки.
 */
export declare function getSubscriptionUrl(subscriptionId: string, rootClientId: string): Promise<GiftResult<{
    uuid: string;
}>>;
/**
 * Получить историю подарочных событий клиента (с пагинацией).
 */
export declare function getGiftHistory(clientId: string, page?: number, limit?: number): Promise<GiftResult<{
    items: Array<{
        id: string;
        eventType: string;
        metadata: unknown;
        createdAt: Date;
        secondarySubscriptionId: string | null;
    }>;
    total: number;
    page: number;
    limit: number;
}>>;
/**
 * Публичная информация о подарочном коде (для страницы /gift/:code).
 * Не требует авторизации.
 */
export declare function getPublicGiftCodeInfo(rawCode: string): Promise<GiftResult<{
    code: string;
    status: string;
    giftMessage: string | null;
    expiresAt: Date;
    createdAt: Date;
    tariffName: string | null;
    isExpired: boolean;
}>>;
/**
 * Создание подарочного кода от лица администратора.
 * Создаёт SecondarySubscription у указанного клиента + генерирует код.
 */
export declare function adminCreateGiftCode(ownerClientId: string, tariffId: string, giftMessage?: string): Promise<GiftResult<{
    code: string;
    expiresAt: Date;
    secondarySubscriptionId: string;
}>>;
//# sourceMappingURL=gift.service.d.ts.map