/**
 * Записать использование промокода (PromoCodeUsage) для оплаченного платежа.
 *
 * Читает `promoCodeId` из `Payment.metadata` (если был применён промо на скидку
 * при создании платежа). Безопасно вызывается несколько раз — на уникальности
 * пары promoCodeId+clientId+createdAt, но на всякий случай ловим ошибку.
 *
 * Вызывается **только** из вебхуков после перевода платежа в статус PAID — это
 * гарантирует, что счётчик использований инкрементится только на реально
 * оплаченные платежи, а не на абандонные.
 */
export declare function recordPromoCodeUsageFromPayment(paymentId: string): Promise<void>;
//# sourceMappingURL=promo-code-usage.util.d.ts.map