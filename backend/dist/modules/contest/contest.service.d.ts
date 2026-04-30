/**
 * Конкурсы: участники по условиям, розыгрыш (random / по дням / по кол-ву оплат), начисление призов.
 */
export type ContestConditions = {
    minTariffDays?: number;
    minPaymentsCount?: number;
    /** Минимальное количество привлечённых рефералов (привёл реферала) */
    minReferrals?: number;
};
export type DrawType = "random" | "by_days_bought" | "by_payments_count" | "by_referrals_count";
export type PrizeType = "custom" | "balance" | "vpn_days";
/** Участник с метриками для сортировки */
export type ContestParticipant = {
    clientId: string;
    totalDaysBought: number;
    paymentsCount: number;
    referralsCount?: number;
};
export declare function parseConditions(json: string | null): ContestConditions;
/**
 * Возвращает список clientId, подходящих под условия конкурса (оплаты в периоде [startAt, endAt]).
 * Для каждого клиента считает totalDaysBought и paymentsCount (только оплаченные тарифы VPN, не прокси/singbox).
 */
export declare function getEligibleParticipants(startAt: Date, endAt: Date, conditions: ContestConditions): Promise<ContestParticipant[]>;
/**
 * Выбирает 3 победителей по правилу drawType и возвращает [clientId1, clientId2, clientId3] (места 1, 2, 3).
 */
export declare function selectWinners(participants: ContestParticipant[], drawType: DrawType): [string, string, string] | null;
/**
 * Проводит розыгрыш: создаёт записи ContestWinner и при необходимости начисляет призы (balance / vpn_days).
 */
export declare function runDraw(contestId: string): Promise<{
    ok: boolean;
    error?: string;
    winners?: unknown[];
}>;
//# sourceMappingURL=contest.service.d.ts.map