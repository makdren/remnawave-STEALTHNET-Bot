/**
 * Отправка писем через SMTP (подтверждение регистрации по email)
 */
export type SmtpConfig = {
    host: string;
    port: number;
    secure: boolean;
    user: string | null;
    password: string | null;
    fromEmail: string | null;
    fromName: string | null;
};
export declare function isSmtpConfigured(config: SmtpConfig): boolean;
/**
 * Отправить письмо с ссылкой для подтверждения регистрации
 */
export declare function sendVerificationEmail(config: SmtpConfig, to: string, verificationLink: string, serviceName: string): Promise<{
    ok: boolean;
    error?: string;
}>;
/**
 * Письмо для привязки email к существующему аккаунту (клиент уже залогинен по Telegram)
 */
export declare function sendLinkEmailVerification(config: SmtpConfig, to: string, verificationLink: string, serviceName: string): Promise<{
    ok: boolean;
    error?: string;
}>;
export type EmailAttachment = {
    filename: string;
    content: Buffer;
};
/**
 * Отправить произвольное письмо (для рассылки). Опционально — вложения.
 */
export declare function sendEmail(config: SmtpConfig, to: string, subject: string, html: string, attachments?: EmailAttachment[]): Promise<{
    ok: boolean;
    error?: string;
}>;
//# sourceMappingURL=mail.service.d.ts.map