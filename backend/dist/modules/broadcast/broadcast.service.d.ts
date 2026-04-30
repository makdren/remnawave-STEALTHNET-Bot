/**
 * Рассылка: отправка сообщения клиентам через Telegram и/или Email.
 */
export type BroadcastChannel = "telegram" | "email" | "both";
export type BroadcastResult = {
    ok: boolean;
    sentTelegram: number;
    sentEmail: number;
    failedTelegram: number;
    failedEmail: number;
    errors: string[];
};
export type BroadcastAttachment = {
    buffer: Buffer;
    mimetype: string;
    originalname: string;
};
export type BroadcastProgress = {
    totalTelegram: number;
    totalEmail: number;
    sentTelegram: number;
    sentEmail: number;
    failedTelegram: number;
    failedEmail: number;
    currentChannel?: "telegram" | "email";
};
/**
 * Запустить рассылку: Telegram и/или Email.
 * subject используется только для email. attachment — опциональное изображение или файл.
 * onProgress — опциональный коллбек для трекинга прогресса (обновляется после
 * каждого отправленного/зафейленного получателя и в момент переключения канала).
 */
export declare function runBroadcast(options: {
    channel: BroadcastChannel;
    subject: string;
    message: string;
    attachment?: BroadcastAttachment;
    buttonText?: string;
    buttonUrl?: string;
    onProgress?: (p: BroadcastProgress) => void;
}): Promise<BroadcastResult>;
/**
 * Количество клиентов с telegramId и с email (для отображения в форме рассылки).
 */
export declare function getBroadcastRecipientsCount(): Promise<{
    withTelegram: number;
    withEmail: number;
}>;
export type BroadcastJobStatus = "running" | "completed" | "error";
export type BroadcastJob = {
    id: string;
    status: BroadcastJobStatus;
    startedAt: Date;
    finishedAt?: Date;
    error?: string;
    result?: BroadcastResult;
    progress: BroadcastProgress;
};
export declare function startBroadcastJob(options: {
    channel: BroadcastChannel;
    subject: string;
    message: string;
    attachment?: BroadcastAttachment;
    buttonText?: string;
    buttonUrl?: string;
}): string;
export declare function getBroadcastJob(jobId: string): BroadcastJob | null;
//# sourceMappingURL=broadcast.service.d.ts.map