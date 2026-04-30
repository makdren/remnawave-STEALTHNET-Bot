/**
 * Применение купленных опций (доп. трафик, устройства, серверы) к пользователю Remna после оплаты.
 */
export type ApplyExtraOptionResult = {
    ok: true;
} | {
    ok: false;
    error: string;
    status: number;
};
/**
 * Применить опцию по оплате: прочитать Payment.metadata.extraOption,
 * получить клиента и remnawaveUuid, обновить пользователя в Remna (добавить трафик/устройства/сквад).
 */
export declare function applyExtraOptionByPaymentId(paymentId: string): Promise<ApplyExtraOptionResult>;
//# sourceMappingURL=extra-options.service.d.ts.map