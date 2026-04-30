/**
 * Планировщик ежедневного напоминания об активном конкурсе (раз в день в 10:00 по умолчанию).
 */
import { type ScheduledTask } from "node-cron";
export declare function startContestDailyReminderScheduler(cronExpression?: string): ScheduledTask | null;
export declare function stopContestDailyReminderScheduler(): void;
//# sourceMappingURL=contest-daily-reminder-scheduler.d.ts.map