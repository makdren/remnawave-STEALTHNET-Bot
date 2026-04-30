/**
 * Heleket API — создание инвойсов и приём webhook.
 * Документация: https://doc.heleket.com/uk/methods/payments/creating-invoice
 * Подпись: md5(base64_encode(body) + API_KEY)
 */
export type HeleketConfig = {
    merchantId: string;
    apiKey: string;
};
export declare function isHeleketConfigured(config: HeleketConfig | null): boolean;
export type CreateHeleketInvoiceParams = {
    config: HeleketConfig;
    amount: string;
    currency: string;
    orderId: string;
    urlCallback?: string;
    urlSuccess?: string;
    urlReturn?: string;
    /** Доп. данные (не показываются клиенту), макс. 255 символов */
    additionalData?: string;
    /** Время жизни инвойса в секундах (300–43200), по умолчанию 3600 */
    lifetime?: number;
    /** Целевая криптовалюта (например USDT) — пользователь платит в ней */
    toCurrency?: string;
    /** Сеть (например tron, bsc) — опционально */
    network?: string;
};
export type CreateHeleketInvoiceResult = {
    ok: true;
    uuid: string;
    url: string;
    paymentStatus: string;
    expiredAt?: number;
} | {
    ok: false;
    error: string;
    status?: number;
};
/**
 * Создаёт инвойс в Heleket. Возвращает URL страницы оплаты.
 */
export declare function createHeleketInvoice(params: CreateHeleketInvoiceParams): Promise<CreateHeleketInvoiceResult>;
/**
 * Проверка подписи webhook: из тела убирают sign, затем md5(base64(json) + apiKey).
 * В JSON при формировании строки слэши экранируют: \/ (как в PHP).
 */
export declare function verifyHeleketWebhookSignature(apiKey: string, rawBody: string, signFromBody: string | undefined): boolean;
//# sourceMappingURL=heleket.service.d.ts.map