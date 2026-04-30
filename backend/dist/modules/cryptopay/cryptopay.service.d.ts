/**
 * Crypto Pay API (Crypto Bot) — создание инвойсов и приём webhook.
 * Документация: https://help.send.tg/en/articles/10279948-crypto-pay-api
 */
export type CryptopayConfig = {
    apiToken: string;
    testnet?: boolean;
};
export declare function isCryptopayConfigured(config: CryptopayConfig | null): boolean;
export type CreateCryptopayInvoiceParams = {
    config: CryptopayConfig;
    /** Сумма в криптовалюте (float string) или в фиате — тогда currency_type + fiat */
    amount: string;
    /** Валюта: crypto — asset (USDT, TON, ...), fiat — fiat (USD, RUB, ...) */
    currencyType?: "crypto" | "fiat";
    asset?: string;
    fiat?: string;
    description: string;
    /** Наши данные (например payment id), до 4kb */
    payload: string;
    /** Срок жизни инвойса в секундах (1–2678400) */
    expiresIn?: number;
};
export type CreateCryptopayInvoiceResult = {
    ok: true;
    invoiceId: number;
    payUrl: string;
    miniAppPayUrl?: string;
    webAppPayUrl?: string;
} | {
    ok: false;
    error: string;
    status?: number;
};
/**
 * Создаёт инвойс в Crypto Pay. Возвращает URL для оплаты (bot_invoice_url).
 */
export declare function createCryptopayInvoice(params: CreateCryptopayInvoiceParams): Promise<CreateCryptopayInvoiceResult>;
/**
 * Проверка подписи webhook: HMAC-SHA256(body, SHA256(token)) === header crypto-pay-api-signature
 */
export declare function verifyCryptopayWebhookSignature(token: string, rawBody: string, signatureHeader: string | undefined): boolean;
//# sourceMappingURL=cryptopay.service.d.ts.map