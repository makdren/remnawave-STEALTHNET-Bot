/**
 * Webhook Platega:
 * - надёжно принимает разные форматы payload (orderId/externalId/transaction.id)
 * - идемпотентно переводит платежи PENDING -> PAID/FAILED
 * - топ-ап: зачисляет баланс атомарно вместе со сменой статуса
 * - тариф: активирует в Remna и распределяет реферальные (с ретраем по повторному webhook)
 */
export declare const plategaWebhooksRouter: import("express-serve-static-core").Router;
//# sourceMappingURL=platega.webhooks.routes.d.ts.map