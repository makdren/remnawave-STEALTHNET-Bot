/**
 * Планировщик ежедневного напоминания об активном конкурсе (раз в день в 10:00 по умолчанию).
 */
import cron from "node-cron";
import { runContestDailyReminder } from "./contest-daily-reminder.service.js";
const DEFAULT_CRON = "0 10 * * *"; // 10:00 каждый день
let currentTask = null;
export function startContestDailyReminderScheduler(cronExpression) {
    const expr = (cronExpression ?? process.env.CONTEST_REMINDER_CRON ?? DEFAULT_CRON).trim();
    const schedule = expr && cron.validate(expr) ? expr : DEFAULT_CRON;
    if (!expr || !cron.validate(expr)) {
        console.warn(`[contest-daily-reminder] Invalid cron "${expr}", using ${DEFAULT_CRON}`);
    }
    if (currentTask) {
        currentTask.stop();
        currentTask = null;
    }
    currentTask = cron.schedule(schedule, async () => {
        try {
            await runContestDailyReminder();
        }
        catch (e) {
            console.error("[contest-daily-reminder] Scheduled run failed:", e);
        }
    });
    console.log(`[contest-daily-reminder] Scheduler started: ${schedule}`);
    return currentTask;
}
export function stopContestDailyReminderScheduler() {
    if (currentTask) {
        currentTask.stop();
        currentTask = null;
    }
}
//# sourceMappingURL=contest-daily-reminder-scheduler.js.map