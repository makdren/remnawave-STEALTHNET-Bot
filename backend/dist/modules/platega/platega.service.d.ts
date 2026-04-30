/**
 * Platega.io — создание платежей и обработка callback
 * https://docs.platega.io/
 */
export type PlategaConfig = {
    merchantId: string;
    secret: string;
};
export declare function isPlategaConfigured(config: PlategaConfig | null): boolean;
/**
 * Создать транзакцию в Platega, получить ссылку на оплату
 * paymentMethod: 2=СПБ, 11=Карты, 12=Международный, 13=Криптовалюта
 */
export declare function createPlategaTransaction(config: PlategaConfig, params: {
    amount: number;
    currency: string;
    orderId: string;
    paymentMethod: number;
    returnUrl: string;
    failedUrl: string;
    description?: string;
}): Promise<{
    paymentUrl: string;
    transactionId: string;
} | {
    error: string;
}>;
//# sourceMappingURL=platega.service.d.ts.map