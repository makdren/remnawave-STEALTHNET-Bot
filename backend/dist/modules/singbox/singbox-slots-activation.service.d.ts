/**
 * Создание sing-box слотов по успешной оплате (singboxTariffId).
 * Вызывается из: webhook YooMoney/YooKassa/Platega, оплата балансом, admin mark-as-paid.
 */
export type CreateSingboxSlotsResult = {
    ok: true;
    slotsCreated: number;
    slotIds: string[];
} | {
    ok: false;
    error: string;
    status: number;
};
/**
 * Выбирает ONLINE ноды (SingboxNode), распределяет слоты round-robin.
 * userIdentifier: UUID для VLESS/Trojan, иначе случайный логин; secret: пароль для SS/Hy2/Trojan.
 */
export declare function createSingboxSlotsByPaymentId(paymentId: string): Promise<CreateSingboxSlotsResult>;
//# sourceMappingURL=singbox-slots-activation.service.d.ts.map