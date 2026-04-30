/**
 * Уведомления пользователя в Telegram (пополнение баланса, оплата тарифа).
 * Вызывается из webhook'ов после успешной обработки платежа.
 */
export declare function sendTelegramToUser(telegramId: string, text: string, messageThreadId?: number | null, replyMarkup?: Record<string, unknown>): Promise<void>;
/**
 * Отправить уведомление о пополнении баланса.
 */
export declare function notifyBalanceToppedUp(clientId: string, amount: number, currency: string, provider?: string): Promise<void>;
/**
 * Отправить уведомление об оплате и активации тарифа.
 */
export declare function notifyTariffActivated(clientId: string, paymentId: string): Promise<void>;
export declare function notifyAdminsAboutNewTicket(params: {
    ticketId: string;
    clientId: string;
    subject: string;
    firstMessage: string;
}): Promise<void>;
export declare function notifyAdminsAboutClientTicketMessage(params: {
    ticketId: string;
    clientId: string;
    content: string;
}): Promise<void>;
export declare function notifyAdminsAboutSupportReply(params: {
    ticketId: string;
    clientId: string;
    content: string;
}): Promise<void>;
export declare function notifyAdminsAboutTicketStatusChange(params: {
    ticketId: string;
    clientId: string;
    subject: string;
    status: string;
}): Promise<void>;
export declare function notifyAdminsAboutNewClient(clientId: string): Promise<void>;
/**
 * Отправить уведомление о создании прокси-слотов (после оплаты).
 */
export declare function notifyProxySlotsCreated(clientId: string, slotIds: string[], tariffName?: string): Promise<void>;
/**
 * Отправить уведомление о создании Sing-box слотов (после оплаты).
 */
export declare function notifySingboxSlotsCreated(clientId: string, slotIds: string[], tariffName?: string): Promise<void>;
export declare function notifyAutoRenewSuccess(clientId: string, tariffName: string, amount: number, currency: string): Promise<void>;
export declare function notifyAutoRenewFailed(clientId: string, tariffName: string, reason: "balance" | "error"): Promise<void>;
/**
 * Уведомление об успешном автоплатеже через ЮKassa.
 */
export declare function notifyAutoRenewYookassaSuccess(clientId: string, tariffName: string, amount: number, currency: string, paymentMethodTitle?: string, balancePortion?: number, cardPortion?: number): Promise<void>;
/**
 * Уведомление о неудачном автоплатеже через ЮKassa.
 */
export declare function notifyAutoRenewYookassaFailed(clientId: string, tariffName: string, error: string): Promise<void>;
/**
 * Уведомление о приближающемся списании (low balance warning).
 * Отправляется за N дней до истечения, если баланс меньше стоимости тарифа.
 */
export declare function notifyAutoRenewUpcoming(clientId: string, tariffName: string, price: number, currency: string, daysLeft: number): Promise<void>;
/**
 * Уведомление о повторной попытке списания (retry attempt).
 */
export declare function notifyAutoRenewRetry(clientId: string, tariffName: string, price: number, currency: string, currentRetry: number, maxRetries: number): Promise<void>;
//# sourceMappingURL=telegram-notify.service.d.ts.map