/**
 * Создание прокси-слотов по успешной оплате (proxyTariffId).
 * Вызывается из: webhook YooMoney/YooKassa/Platega, admin mark-as-paid.
 */
export type CreateProxySlotsResult = {
    ok: true;
    slotsCreated: number;
    slotIds: string[];
} | {
    ok: false;
    error: string;
    status: number;
};
/**
 * Выбирает ONLINE ноды, исключая DISABLED. Распределяет слоты round-robin.
 */
export declare function createProxySlotsByPaymentId(paymentId: string): Promise<CreateProxySlotsResult>;
//# sourceMappingURL=proxy-slots-activation.service.d.ts.map