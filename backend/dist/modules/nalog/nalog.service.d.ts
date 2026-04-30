/**
 * Сервис «Мой Налог» для самозанятых — авторизация, хранение токенов, выпуск чеков.
 * Токены хранятся в SystemSetting; при истечении автоматически обновляются.
 */
export interface NalogReceiptResult {
    ok: boolean;
    receiptUuid?: string;
    printUrl?: string;
    error?: string;
}
/**
 * Создать чек самозанятого при получении оплаты.
 * Вызывается из webhook-ов после подтверждения платежа.
 */
export declare function createNalogReceipt(params: {
    paymentId: string;
    amount: number;
    currency: string;
    description: string;
    paidAt?: Date;
}): Promise<NalogReceiptResult>;
/**
 * Проверить подключение к Мой Налог (аутентификация).
 */
export declare function testNalogConnection(): Promise<{
    ok: boolean;
    error?: string;
    inn?: string;
}>;
//# sourceMappingURL=nalog.service.d.ts.map