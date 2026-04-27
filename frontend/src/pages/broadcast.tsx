import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/contexts/auth";
import { api, type BroadcastResult, type BroadcastProgress } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { motion } from "framer-motion";
import { Send, Paperclip, X, MousePointerClick, Mail, MessageSquare, Loader2, AlertTriangle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

const MAX_ATTACHMENT_MB = 20;

const BUTTON_ACTIONS = [
  { value: "", label: "Без кнопки" },
  { value: "menu:tariffs", label: "📦 Тарифы" },
  { value: "menu:topup", label: "💳 Пополнить баланс" },
  { value: "menu:profile", label: "👤 Профиль" },
  { value: "menu:trial", label: "🎁 Бесплатный триал" },
  { value: "menu:referral", label: "🔗 Реферальная программа" },
  { value: "menu:promocode", label: "🎟️ Промокод" },
  { value: "menu:support", label: "🆘 Поддержка" },
  { value: "menu:vpn", label: "📋 VPN подключение" },
  { value: "menu:devices", label: "📱 Устройства" },
  { value: "menu:extra_options", label: "➕ Доп. опции" },
  { value: "menu:main", label: "📋 Главное меню" },
  { value: "webapp:/cabinet", label: "🌐 Web кабинет" },
  { value: "webapp:/cabinet/subscribe", label: "🌐 Страница подключения" },
  { value: "webapp:/cabinet/tickets", label: "🌐 Тикеты" },
  { value: "__custom_url__", label: "🔗 Своя ссылка (URL)" },
];

export function BroadcastPage() {
  const { state } = useAuth();
  const token = state.accessToken ?? "";
  const [broadcastRecipients, setBroadcastRecipients] = useState<{ withTelegram: number; withEmail: number } | null>(null);
  const [broadcastChannel, setBroadcastChannel] = useState<"telegram" | "email" | "both">("telegram");
  const [broadcastSubject, setBroadcastSubject] = useState("");
  const [broadcastMessage, setBroadcastMessage] = useState("");
  const [broadcastAttachment, setBroadcastAttachment] = useState<File | null>(null);
  const [broadcastButtonText, setBroadcastButtonText] = useState("");
  const [broadcastButtonAction, setBroadcastButtonAction] = useState("");
  const [broadcastButtonCustomUrl, setBroadcastButtonCustomUrl] = useState("");
  const [broadcastLoading, setBroadcastLoading] = useState(false);
  const [broadcastResult, setBroadcastResult] = useState<BroadcastResult | null>(null);
  const [broadcastProgress, setBroadcastProgress] = useState<BroadcastProgress | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (token) {
      api.broadcastRecipientsCount(token).then(setBroadcastRecipients).catch(() => setBroadcastRecipients(null));
    }
  }, [token]);

  async function handleBroadcastSend(e: React.FormEvent) {
    e.preventDefault();
    const text = broadcastMessage.trim();
    if (!text) return;
    if (broadcastAttachment && broadcastAttachment.size > MAX_ATTACHMENT_MB * 1024 * 1024) {
      setBroadcastResult({
        ok: false,
        sentTelegram: 0,
        sentEmail: 0,
        failedTelegram: 0,
        failedEmail: 0,
        errors: [`Файл не должен превышать ${MAX_ATTACHMENT_MB} МБ`],
      });
      return;
    }
    setBroadcastLoading(true);
    setBroadcastResult(null);
    setBroadcastProgress(null);
    try {
      const resolvedAction = broadcastButtonAction === "__custom_url__" ? broadcastButtonCustomUrl.trim() : broadcastButtonAction;
      // Фронтенд больше не ждёт окончания рассылки в одном HTTP-запросе
      // (для больших аудиторий упирались в таймаут) — бэкенд ставит задачу
      // в фон и отдаёт jobId, а дальше опрашиваем статус до завершения.
      const { jobId } = await api.broadcast(
        token,
        {
          channel: broadcastChannel,
          subject: broadcastSubject.trim() || undefined,
          message: text,
          buttonText: broadcastButtonText.trim() || undefined,
          buttonUrl: resolvedAction || undefined,
        },
        broadcastAttachment ?? undefined
      );
      const finalResult = await pollBroadcastJob(jobId);
      setBroadcastResult(finalResult);
      if (finalResult.ok) {
        setBroadcastMessage("");
        setBroadcastSubject("");
        setBroadcastAttachment(null);
        setBroadcastButtonText("");
        setBroadcastButtonAction("");
        setBroadcastButtonCustomUrl("");
        api.broadcastRecipientsCount(token).then(setBroadcastRecipients).catch(() => {});
      }
    } catch (err) {
      setBroadcastResult({
        ok: false,
        sentTelegram: 0,
        sentEmail: 0,
        failedTelegram: 0,
        failedEmail: 0,
        errors: [err instanceof Error ? err.message : "Ошибка отправки"],
      });
    } finally {
      setBroadcastLoading(false);
      setBroadcastProgress(null);
    }
  }

  async function pollBroadcastJob(jobId: string): Promise<BroadcastResult> {
    // Опрашиваем до получения статуса completed/error. Ставим мягкий таймаут
    // на 30 минут — для очень больших рассылок (60мс × тысячи TG + 200мс × email).
    const deadline = Date.now() + 30 * 60 * 1000;
    while (Date.now() < deadline) {
      try {
        const s = await api.broadcastStatus(token, jobId);
        if (s.progress) setBroadcastProgress(s.progress);
        if (s.status === "completed" && s.result) return s.result;
        if (s.status === "error") {
          return {
            ok: false,
            sentTelegram: s.progress?.sentTelegram ?? 0,
            sentEmail: s.progress?.sentEmail ?? 0,
            failedTelegram: s.progress?.failedTelegram ?? 0,
            failedEmail: s.progress?.failedEmail ?? 0,
            errors: [s.error || "Ошибка рассылки"],
          };
        }
      } catch {
        // сеть моргнула — повторим
      }
      await new Promise((r) => setTimeout(r, 1500));
    }
    return {
      ok: false,
      sentTelegram: 0,
      sentEmail: 0,
      failedTelegram: 0,
      failedEmail: 0,
      errors: ["Превышен таймаут опроса статуса. Рассылка, возможно, всё ещё идёт — проверьте позже."],
    };
  }

  return (
    <div className="space-y-5 px-4 sm:px-6 md:px-8 pt-6 pb-10 relative">
      <div className="fixed -z-10 bg-primary/15 blur-[120px] top-[-50px] left-[-50px] w-[300px] h-[300px] rounded-full pointer-events-none" />
      <div className="fixed -z-10 bg-purple-500/10 blur-[100px] top-[20%] right-[-50px] w-[250px] h-[250px] rounded-full pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between bg-background/40 backdrop-blur-3xl border border-white/10 p-6 rounded-[2rem] shadow-2xl"
      >
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-primary/20 to-purple-500/20 flex items-center justify-center shadow-inner border border-white/10">
            <Send className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/60">
              Рассылка
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Сообщения клиентам в Telegram и/или на email</p>
          </div>
        </div>
        {broadcastRecipients && (
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 text-primary border border-primary/20 px-3 py-1 text-xs font-medium backdrop-blur-md">
              <MessageSquare className="h-3.5 w-3.5" />
              Telegram: {broadcastRecipients.withTelegram}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-cyan-500/10 text-cyan-500 dark:text-cyan-400 border border-cyan-500/20 px-3 py-1 text-xs font-medium backdrop-blur-md">
              <Mail className="h-3.5 w-3.5" />
              Email: {broadcastRecipients.withEmail}
            </span>
          </div>
        )}
      </motion.div>

      <Card className="bg-background/60 backdrop-blur-3xl border-white/10 rounded-[2rem] p-5 sm:p-6 shadow-xl">
        <form onSubmit={handleBroadcastSend} className="space-y-5">
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Канал отправки</Label>
            <div className="flex items-center gap-1 bg-foreground/[0.03] dark:bg-white/[0.02] p-1 rounded-xl border border-white/5 w-fit">
              {(
                [
                  { value: "telegram", label: "Telegram", icon: MessageSquare },
                  { value: "email", label: "Email", icon: Mail },
                  { value: "both", label: "Telegram + Email", icon: Send },
                ] as const
              ).map((c) => {
                const Icon = c.icon;
                const isActive = broadcastChannel === c.value;
                return (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setBroadcastChannel(c.value)}
                    className={cn(
                      "rounded-lg px-3 py-1.5 text-xs font-medium transition-all flex items-center gap-1.5",
                      isActive
                        ? "bg-primary text-primary-foreground shadow-md"
                        : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {c.label}
                  </button>
                );
              })}
            </div>
          </div>

          {(broadcastChannel === "email" || broadcastChannel === "both") && (
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Тема письма (для email)</Label>
              <Input
                value={broadcastSubject}
                onChange={(e) => setBroadcastSubject(e.target.value)}
                placeholder="Сообщение от сервиса"
                maxLength={500}
                className="max-w-md rounded-xl bg-foreground/[0.03] dark:bg-white/[0.02] border-white/10 focus-visible:ring-primary/50"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Текст сообщения (до 4096 символов)</Label>
            <textarea
              className="flex min-h-[140px] w-full rounded-xl border border-white/10 bg-foreground/[0.03] dark:bg-white/[0.02] px-4 py-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 resize-y"
              value={broadcastMessage}
              onChange={(e) => setBroadcastMessage(e.target.value)}
              placeholder="Введите текст рассылки. Для Telegram поддерживается HTML."
              maxLength={4096}
              required
            />
            <p className="text-[11px] text-muted-foreground">{broadcastMessage.length} / 4096</p>
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Изображение или файл (до {MAX_ATTACHMENT_MB} МБ)</Label>
            <div className="flex flex-wrap items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.pdf,.doc,.docx,.txt"
                className="hidden"
                onChange={(e) => setBroadcastAttachment(e.target.files?.[0] ?? null)}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5 rounded-xl"
                onClick={() => fileInputRef.current?.click()}
              >
                <Paperclip className="h-4 w-4" />
                Выбрать файл
              </Button>
              {broadcastAttachment && (
                <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 text-primary border border-primary/20 px-3 py-1 text-xs font-medium">
                  {broadcastAttachment.name}
                  <button
                    type="button"
                    className="text-primary/70 hover:text-primary"
                    onClick={() => setBroadcastAttachment(null)}
                    aria-label="Удалить вложение"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </span>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground">
              В Telegram: фото — как фото с подписью, документы — как файлы. В email — вложение.
            </p>
          </div>

          {(broadcastChannel === "telegram" || broadcastChannel === "both") && (
            <div className="rounded-2xl border border-white/10 bg-foreground/[0.03] dark:bg-white/[0.02] p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <MousePointerClick className="h-4 w-4 text-primary" />
                Кнопка под сообщением (только Telegram)
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Действие кнопки</Label>
                  <select
                    className="flex h-10 w-full rounded-xl border border-white/10 bg-background/60 px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                    value={broadcastButtonAction}
                    onChange={(e) => setBroadcastButtonAction(e.target.value)}
                  >
                    {BUTTON_ACTIONS.map((a) => (
                      <option key={a.value} value={a.value}>{a.label}</option>
                    ))}
                  </select>
                </div>
                {broadcastButtonAction && (
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Текст кнопки</Label>
                    <Input
                      value={broadcastButtonText}
                      onChange={(e) => setBroadcastButtonText(e.target.value)}
                      placeholder="Открыть тарифы"
                      maxLength={64}
                      className="h-10 rounded-xl bg-background/60 border-white/10 focus-visible:ring-primary/50"
                    />
                  </div>
                )}
              </div>
              {broadcastButtonAction === "__custom_url__" && (
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Ссылка (URL)</Label>
                  <Input
                    value={broadcastButtonCustomUrl}
                    onChange={(e) => setBroadcastButtonCustomUrl(e.target.value)}
                    placeholder="https://example.com/tariffs"
                    maxLength={500}
                    className="h-10 rounded-xl bg-background/60 border-white/10 focus-visible:ring-primary/50"
                  />
                </div>
              )}
              <p className="text-[11px] text-muted-foreground">
                Под сообщением появится inline-кнопка с выбранным действием.
              </p>
            </div>
          )}

          <Button type="submit" disabled={broadcastLoading || !broadcastMessage.trim()} className="gap-2 rounded-xl">
            {broadcastLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {broadcastLoading ? "Рассылка идёт…" : "Отправить рассылку"}
          </Button>

          {broadcastLoading && broadcastProgress && !broadcastResult && (
            <BroadcastProgressPanel progress={broadcastProgress} />
          )}

          {broadcastResult && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                "rounded-2xl border p-4 text-sm backdrop-blur-md",
                broadcastResult.ok
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-500 dark:text-emerald-400"
                  : "border-amber-500/30 bg-amber-500/10 text-amber-500 dark:text-amber-400"
              )}
            >
              <div className="flex items-start gap-2">
                {broadcastResult.ok ? <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" /> : <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />}
                <div className="flex-1">
                  {broadcastResult.ok ? (
                    <p>Отправлено: Telegram <strong>{broadcastResult.sentTelegram}</strong>, Email <strong>{broadcastResult.sentEmail}</strong></p>
                  ) : (
                    <>
                      <p>Telegram: отправлено {broadcastResult.sentTelegram}, ошибок {broadcastResult.failedTelegram}. Email: отправлено {broadcastResult.sentEmail}, ошибок {broadcastResult.failedEmail}.</p>
                      {broadcastResult.errors.length > 0 && (
                        <ul className="mt-2 list-disc pl-4 text-foreground/70">
                          {broadcastResult.errors.slice(0, 5).map((err, i) => (
                            <li key={i}>{err}</li>
                          ))}
                          {broadcastResult.errors.length > 5 && <li>…и ещё {broadcastResult.errors.length - 5}</li>}
                        </ul>
                      )}
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </form>
      </Card>
    </div>
  );
}

function BroadcastProgressPanel({ progress }: { progress: BroadcastProgress }) {
  const tgDone = progress.sentTelegram + progress.failedTelegram;
  const emailDone = progress.sentEmail + progress.failedEmail;
  const tgPct = progress.totalTelegram > 0 ? Math.min(100, Math.round((tgDone / progress.totalTelegram) * 100)) : 0;
  const emailPct = progress.totalEmail > 0 ? Math.min(100, Math.round((emailDone / progress.totalEmail) * 100)) : 0;
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-primary/30 bg-primary/5 p-4 text-sm backdrop-blur-md space-y-3"
    >
      <div className="flex items-center gap-2">
        <Loader2 className="h-4 w-4 animate-spin text-primary" />
        <p className="font-medium">
          Рассылка идёт{progress.currentChannel === "telegram" ? " — Telegram" : progress.currentChannel === "email" ? " — Email" : ""}…
        </p>
      </div>
      {progress.totalTelegram > 0 && (
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1"><MessageSquare className="h-3.5 w-3.5" /> Telegram</span>
            <span>
              <strong className="text-foreground">{tgDone}</strong> / {progress.totalTelegram}
              {progress.failedTelegram > 0 && <span className="ml-2 text-amber-500">ошибок {progress.failedTelegram}</span>}
            </span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${tgPct}%` }}
            />
          </div>
        </div>
      )}
      {progress.totalEmail > 0 && (
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1"><Mail className="h-3.5 w-3.5" /> Email</span>
            <span>
              <strong className="text-foreground">{emailDone}</strong> / {progress.totalEmail}
              {progress.failedEmail > 0 && <span className="ml-2 text-amber-500">ошибок {progress.failedEmail}</span>}
            </span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-cyan-500 transition-all duration-300"
              style={{ width: `${emailPct}%` }}
            />
          </div>
        </div>
      )}
      {progress.totalTelegram === 0 && progress.totalEmail === 0 && (
        <p className="text-xs text-muted-foreground">Подготавливаем получателей…</p>
      )}
    </motion.div>
  );
}
