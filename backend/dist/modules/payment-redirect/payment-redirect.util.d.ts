/**
 * Сохранить «сырую» ссылку платёжки в Payment.metadata.redirectTargetUrl и вернуть
 * наш redirect-URL (`https://<app>/api/pay/<orderId>`), который выдаётся пользователю.
 *
 * Если `publicAppUrl` пуст — fallback к «сырой» ссылке (старое поведение).
 */
export declare function saveRedirectAndBuildUrl(paymentId: string, orderId: string, providerUrl: string, publicAppUrl: string | null | undefined): Promise<string>;
//# sourceMappingURL=payment-redirect.util.d.ts.map