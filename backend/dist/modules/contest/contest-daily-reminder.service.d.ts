export declare function runContestDailyReminder(): Promise<{
    sent: number;
    errors: number;
}>;
export declare function sendContestStartNotification(contestId: string): Promise<{
    ok: boolean;
    sent?: number;
    errors?: number;
    error?: string;
}>;
export declare function sendContestDrawResults(contestId: string): Promise<void>;
//# sourceMappingURL=contest-daily-reminder.service.d.ts.map