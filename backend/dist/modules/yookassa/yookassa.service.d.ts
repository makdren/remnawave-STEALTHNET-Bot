/**
 * ЮKassa API — создание платежа (redirect на страницу оплаты).
 * Документация: https://yookassa.ru/developers/api#create_payment
 */
export type CreatePaymentParams = {
    shopId: string;
    secretKey: string;
    amount: number;
    currency: string;
    returnUrl: string;
    description: string;
    metadata: Record<string, string>;
    /** Email покупателя для чека 54-ФЗ (обязателен при включённых чеках в ЮKassa) */
    customerEmail?: string | null;
    /** Сохранить способ оплаты для рекуррентных платежей */
    savePaymentMethod?: boolean;
};
export type CreatePaymentResult = {
    ok: true;
    paymentId: string;
    confirmationUrl: string;
    status: string;
} | {
    ok: false;
    error: string;
    status?: number;
};
/**
 * Создаёт платёж в ЮKassa. Возвращает confirmation_url для редиректа пользователя.
 * Idempotence-Key: генерируется из metadata.payment_id + timestamp для уникальности.
 */
export declare function createYookassaPayment(params: CreatePaymentParams): Promise<CreatePaymentResult>;
export declare function isYookassaConfigured(shopId: string | null, secretKey: string | null): boolean;
export type AutopaymentParams = {
    shopId: string;
    secretKey: string;
    amount: number;
    currency: string;
    paymentMethodId: string;
    description: string;
    metadata: Record<string, string>;
    customerEmail?: string | null;
};
export type AutopaymentResult = {
    ok: true;
    paymentId: string;
    status: string;
} | {
    ok: false;
    error: string;
    reason?: string;
};
/**
 * Создаёт автоплатёж через сохранённый payment_method_id.
 * Не требует подтверждения пользователя — деньги списываются сразу (capture: true).
 */
export declare function createYookassaAutopayment(params: AutopaymentParams): Promise<AutopaymentResult>;
//# sourceMappingURL=yookassa.service.d.ts.map