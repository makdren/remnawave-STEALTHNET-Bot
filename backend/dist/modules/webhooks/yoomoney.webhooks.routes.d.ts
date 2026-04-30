/**
 * HTTP-уведомления ЮMoney о входящих переводах (оплата картой).
 * Пополнение баланса (без tariffId) → зачисляем на баланс клиента.
 * Покупка тарифа (есть tariffId) → активируем тариф в Remnawave, баланс не трогаем.
 * Проверка подлинности: SHA1(notification_type&operation_id&amount&currency&datetime&sender&codepro&notification_secret&label)
 */
export declare const yoomoneyWebhooksRouter: import("express-serve-static-core").Router;
//# sourceMappingURL=yoomoney.webhooks.routes.d.ts.map