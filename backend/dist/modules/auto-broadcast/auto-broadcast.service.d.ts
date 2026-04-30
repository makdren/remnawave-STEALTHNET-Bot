/**
 * Авто-рассылка: настраиваемые правила (после регистрации, неактивность, без платежа и т.д.).
 * Джоб выбирает подходящих клиентов, отправляет сообщение и пишет лог.
 *
 * Триггеры делятся на два типа:
 *  - ONE-TIME: отправляется клиенту один раз за всё время (after_registration, no_payment,
 *              trial_not_connected, trial_used_never_paid, no_traffic)
 *  - RECURRING: может отправляться повторно, если условие снова наступило — дедупликация
 *              за последние RECURRING_COOLDOWN_DAYS дней (inactivity, subscription_expired,
 *              subscription_ending_soon)
 */
export type TriggerType = "after_registration" | "inactivity" | "no_payment" | "trial_not_connected" | "trial_used_never_paid" | "no_traffic" | "subscription_expired" | "subscription_ending_soon";
/**
 * Получить ID клиентов, подходящих под правило (с учётом дедупликации, окна,
 * канала доставки и статуса авто-продления).
 */
export declare function getEligibleClientIds(ruleId: string): Promise<string[]>;
export type RunRuleResult = {
    ruleId: string;
    ruleName: string;
    sent: number;
    skipped: number;
    errors: string[];
};
/**
 * Выполнить одно правило: отправить сообщение подходящим клиентам и записать лог.
 */
export declare function runRule(ruleId: string): Promise<RunRuleResult>;
/**
 * Запустить все включённые правила.
 */
export declare function runAllRules(): Promise<RunRuleResult[]>;
//# sourceMappingURL=auto-broadcast.service.d.ts.map