/**
 * Удаляет заброшенные email-аккаунты, где onboardingCompleted = false
 * (пользователь зарегистрировался через email, но не задал пароль и ушёл).
 *
 * Запускается каждые 15 минут. Удаляет аккаунты старше 30 минут.
 */
export declare function startAbandonedAccountsCleanup(): void;
//# sourceMappingURL=abandoned-accounts.cron.d.ts.map