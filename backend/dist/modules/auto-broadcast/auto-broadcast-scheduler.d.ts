/**
 * Запуск авто-рассылки по расписанию (cron).
 * По умолчанию — раз в день в 9:00 (по времени сервера).
 * Расписание можно менять в админке (настройки → авто-рассылка или системные настройки).
 */
import { type ScheduledTask } from "node-cron";
/** Запустить планировщик. Если выражение не передано — берётся из настроек (БД) или env, иначе по умолчанию 9:00. */
export declare function startAutoBroadcastScheduler(cronExpression?: string): Promise<ScheduledTask | null>;
/** Перезапустить планировщик с актуальным расписанием из настроек (после сохранения в админке). */
export declare function restartAutoBroadcastScheduler(): Promise<void>;
/** Остановить планировщик (при завершении процесса). */
export declare function stopAutoBroadcastScheduler(): void;
//# sourceMappingURL=auto-broadcast-scheduler.d.ts.map