/**
 * Сервис активации тарифа в Remnawave для конкретного клиента.
 * Используется из: оплата балансом, вебхук Platega, админ mark-as-paid.
 */
export type ActivationResult = {
    ok: true;
} | {
    ok: false;
    error: string;
    status: number;
};
export type TrafficResetMode = "no_reset" | "on_purchase" | "monthly" | "monthly_rolling";
/**
 * Активирует тариф для клиента в Remnawave:
 * - обновляет/создаёт пользователя с expireAt, trafficLimitBytes (в байтах), deviceLimit
 * - назначает activeInternalSquads
 * - При покупке другого тарифа применяет pro-rata конвертацию остатка
 * - При покупке того же тарифа — дни просто суммируются
 *
 * `selectedOption` — выбранная клиентом опция (длительность + цена). Если не задана,
 * fallback на legacy tariff.durationDays + tariff.price.
 *
 * Лимит трафика: в панели 1 ГБ = 1 ГиБ = 1024³ байт; в Remna передаём значение в байтах как есть.
 */
export declare function activateTariffForClient(client: {
    id: string;
    remnawaveUuid: string | null;
    email: string | null;
    telegramId: string | null;
    telegramUsername?: string | null;
}, tariff: {
    id?: string;
    durationDays: number;
    trafficLimitBytes: bigint | null;
    deviceLimit: number | null;
    internalSquadUuids: string[];
    trafficResetMode?: string;
    price?: number;
}, selectedOption?: {
    durationDays: number;
    price: number;
}): Promise<ActivationResult>;
/**
 * Активация тарифа по paymentId — находит клиента и тариф из Payment (или customBuild из metadata), вызывает activateTariffForClient.
 */
export declare function activateTariffByPaymentId(paymentId: string): Promise<ActivationResult>;
//# sourceMappingURL=tariff-activation.service.d.ts.map