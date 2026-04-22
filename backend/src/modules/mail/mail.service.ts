/**
 * Отправка писем через SMTP (подтверждение регистрации по email)
 */

import nodemailer from "nodemailer";

export type SmtpConfig = {
  host: string;
  port: number;
  secure: boolean;
  user: string | null;
  password: string | null;
  fromEmail: string | null;
  fromName: string | null;
};

export function isSmtpConfigured(config: SmtpConfig): boolean {
  return Boolean(
    config.host &&
    config.port &&
    config.fromEmail
  );
}

/**
 * Отправить письмо с ссылкой для подтверждения регистрации
 */
export async function sendVerificationEmail(
  config: SmtpConfig,
  to: string,
  verificationLink: string,
  serviceName: string,
  template?: string | null
): Promise<{ ok: boolean; error?: string }> {
  if (!isSmtpConfigured(config)) {
    return { ok: false, error: "SMTP not configured" };
  }

  const auth = config.user && config.password ? { user: config.user, pass: config.password } : undefined;
  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth,
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 10000,
  });

  const from = config.fromName
    ? `"${config.fromName}" <${config.fromEmail}>`
    : config.fromEmail!;

  const subject = `Подтверждение регистрации — ${serviceName}`;
  const html = renderVerificationTemplate(serviceName, verificationLink, template);

  try {
    await transporter.sendMail({
      from,
      to,
      subject,
      html,
    });
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: message };
  }
}

function renderVerificationTemplate(serviceName: string, verificationLink: string, template?: string | null): string {
  const fallback = [
    "Здравствуйте!",
    "Для завершения регистрации в {{serviceName}} перейдите по ссылке:",
    "{{verificationLink}}",
    "Ссылка действительна 24 часа.",
    "Если вы не регистрировались, проигнорируйте это письмо.",
  ].join("\n");
  const src = (template && template.trim()) || fallback;
  const prepared = src
    .replaceAll("{{serviceName}}", serviceName)
    .replaceAll("{{verificationLink}}", verificationLink);
  const escaped = prepared
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => {
      if (line.includes(verificationLink)) {
        return line.replaceAll(verificationLink, `<a href="${verificationLink}">${verificationLink}</a>`);
      }
      return line;
    });
  return `<p>${escaped.join("</p><p>")}</p>`;
}

/**
 * Письмо для привязки email к существующему аккаунту (клиент уже залогинен по Telegram)
 */
export async function sendLinkEmailVerification(
  config: SmtpConfig,
  to: string,
  verificationLink: string,
  serviceName: string
): Promise<{ ok: boolean; error?: string }> {
  if (!isSmtpConfigured(config)) {
    return { ok: false, error: "SMTP not configured" };
  }

  const auth = config.user && config.password ? { user: config.user, pass: config.password } : undefined;
  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth,
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 10000,
  });

  const from = config.fromName
    ? `"${config.fromName}" <${config.fromEmail}>`
    : config.fromEmail!;

  const subject = `Привязка почты к аккаунту — ${serviceName}`;
  const html = `
    <p>Здравствуйте!</p>
    <p>Для привязки этой почты к вашему аккаунту в ${serviceName} перейдите по ссылке:</p>
    <p><a href="${verificationLink}">${verificationLink}</a></p>
    <p>Ссылка действительна 24 часа.</p>
    <p>Если вы не запрашивали привязку, проигнорируйте это письмо.</p>
  `;

  try {
    await transporter.sendMail({
      from,
      to,
      subject,
      html,
    });
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: message };
  }
}

/**
 * Письмо с одноразовым кодом входа в кабинет
 */
export async function sendLoginCodeEmail(
  config: SmtpConfig,
  to: string,
  code: string,
  serviceName: string
): Promise<{ ok: boolean; error?: string }> {
  if (!isSmtpConfigured(config)) {
    return { ok: false, error: "SMTP not configured" };
  }

  const auth = config.user && config.password ? { user: config.user, pass: config.password } : undefined;
  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth,
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 10000,
  });

  const from = config.fromName
    ? `"${config.fromName}" <${config.fromEmail}>`
    : config.fromEmail!;

  const subject = `Код входа — ${serviceName}`;
  const html = `
    <p>Здравствуйте!</p>
    <p>Ваш одноразовый код для входа в ${serviceName}:</p>
    <p style="font-size:24px; font-weight:700; letter-spacing:4px; margin:16px 0;">${code}</p>
    <p>Код действует 10 минут.</p>
    <p>Если вы не запрашивали вход, проигнорируйте это письмо.</p>
  `;

  try {
    await transporter.sendMail({
      from,
      to,
      subject,
      html,
    });
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: message };
  }
}

export async function sendPasswordResetEmail(
  config: SmtpConfig,
  to: string,
  resetLink: string,
  serviceName: string
): Promise<{ ok: boolean; error?: string }> {
  if (!isSmtpConfigured(config)) {
    return { ok: false, error: "SMTP not configured" };
  }

  const auth = config.user && config.password ? { user: config.user, pass: config.password } : undefined;
  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth,
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 10000,
  });

  const from = config.fromName
    ? `"${config.fromName}" <${config.fromEmail}>`
    : config.fromEmail!;

  const subject = `Восстановление пароля — ${serviceName}`;
  const html = `
    <p>Здравствуйте!</p>
    <p>Чтобы восстановить пароль в ${serviceName}, перейдите по ссылке:</p>
    <p><a href="${resetLink}">${resetLink}</a></p>
    <p>Ссылка действительна 1 час.</p>
    <p>Если вы не запрашивали восстановление, проигнорируйте это письмо.</p>
  `;

  try {
    await transporter.sendMail({
      from,
      to,
      subject,
      html,
    });
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: message };
  }
}

export type EmailAttachment = { filename: string; content: Buffer };

/**
 * Отправить произвольное письмо (для рассылки). Опционально — вложения.
 */
export async function sendEmail(
  config: SmtpConfig,
  to: string,
  subject: string,
  html: string,
  attachments?: EmailAttachment[]
): Promise<{ ok: boolean; error?: string }> {
  if (!isSmtpConfigured(config)) {
    return { ok: false, error: "SMTP not configured" };
  }

  const auth = config.user && config.password ? { user: config.user, pass: config.password } : undefined;
  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth,
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 10000,
  });

  const from = config.fromName
    ? `"${config.fromName}" <${config.fromEmail}>`
    : config.fromEmail!;

  try {
    await transporter.sendMail({
      from,
      to,
      subject,
      html,
      ...(attachments?.length ? { attachments: attachments.map((a) => ({ filename: a.filename, content: a.content })) } : {}),
    });
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: message };
  }
}
