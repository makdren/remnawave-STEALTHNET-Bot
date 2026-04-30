/**
 * Webhook Heleket: статусы paid, paid_over.
 * Проверка подписи: md5(base64(json без sign) + apiKey), слэши в JSON экранированы.
 * Документация: https://doc.heleket.com/methods/payments/webhook
 */
export declare const heleketWebhooksRouter: import("express-serve-static-core").Router;
//# sourceMappingURL=heleket.webhooks.routes.d.ts.map