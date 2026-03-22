import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/auth";
import {
  api,
  type AutoBroadcastRule,
  type AutoBroadcastRulePayload,
  type AutoBroadcastTriggerType,
} from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CalendarClock, Plus, Play, Trash2, Pencil, Loader2, Clock, MousePointerClick } from "lucide-react";

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

const TRIGGER_LABELS: Record<AutoBroadcastTriggerType, string> = {
  after_registration: "После регистрации",
  inactivity: "Неактивность (нет оплат)",
  no_payment: "Ни разу не платил",
  trial_not_connected: "Не подключил триал",
  trial_used_never_paid: "Пользовался триалом, но не оплатил",
  no_traffic: "Подключён к VPN (напоминание)",
  subscription_expired: "Подписка истекла",
  subscription_ending_soon: "Подписка заканчивается скоро (за N дней)",
};

const CHANNEL_LABELS: Record<string, string> = {
  telegram: "Telegram",
  email: "Email",
  both: "Telegram и Email",
};

export function AutoBroadcastPage() {
  const { state } = useAuth();
  const token = state.accessToken ?? "";
  const [rules, setRules] = useState<AutoBroadcastRule[]>([]);
  const [eligibleCounts, setEligibleCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [runAllLoading, setRunAllLoading] = useState(false);
  const [runningRuleId, setRunningRuleId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<AutoBroadcastRulePayload>({
    name: "",
    triggerType: "after_registration",
    delayDays: 1,
    channel: "telegram",
    subject: "",
    message: "",
    buttonText: "",
    buttonUrl: "",
    enabled: true,
  });
  const [formSaving, setFormSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [scheduleCron, setScheduleCron] = useState("");
  const [scheduleSaving, setScheduleSaving] = useState(false);

  function loadRules() {
    if (!token) return;
    setLoading(true);
    api
      .getAutoBroadcastRules(token)
      .then((list) => {
        setRules(list);
        return list;
      })
      .then((list) => {
        const counts: Record<string, number> = {};
        Promise.all(
          list.map((r) =>
            api.getAutoBroadcastEligibleCount(token, r.id).then(({ count }) => {
              counts[r.id] = count;
            })
          )
        ).then(() => setEligibleCounts(counts));
      })
      .catch(() => setRules([]))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadRules();
  }, [token]);

  useEffect(() => {
    if (token) {
      api.getSettings(token).then((s) => setScheduleCron(s.autoBroadcastCron ?? "")).catch(() => {});
    }
  }, [token]);

  async function handleSaveSchedule(e: React.FormEvent) {
    e.preventDefault();
    setScheduleSaving(true);
    try {
      await api.updateSettings(token, { autoBroadcastCron: scheduleCron.trim() || null });
    } catch {
      // ignore
    } finally {
      setScheduleSaving(false);
    }
  }

  const [buttonAction, setButtonAction] = useState("");
  const [buttonCustomUrl, setButtonCustomUrl] = useState("");

  function resolveActionFromUrl(url: string | null): { action: string; customUrl: string } {
    if (!url) return { action: "", customUrl: "" };
    if (BUTTON_ACTIONS.some((a) => a.value === url && a.value !== "__custom_url__")) {
      return { action: url, customUrl: "" };
    }
    return { action: "__custom_url__", customUrl: url };
  }

  function openCreate() {
    setEditingId(null);
    setForm({
      name: "",
      triggerType: "after_registration",
      delayDays: 1,
      channel: "telegram",
      subject: "",
      message: "",
      buttonText: "",
      buttonUrl: "",
      enabled: true,
    });
    setButtonAction("");
    setButtonCustomUrl("");
    setFormError(null);
    setShowForm(true);
  }

  function openEdit(rule: AutoBroadcastRule) {
    setEditingId(rule.id);
    const { action, customUrl } = resolveActionFromUrl(rule.buttonUrl);
    setForm({
      name: rule.name,
      triggerType: rule.triggerType,
      delayDays: rule.delayDays,
      channel: rule.channel,
      subject: rule.subject ?? "",
      message: rule.message,
      buttonText: rule.buttonText ?? "",
      buttonUrl: rule.buttonUrl ?? "",
      enabled: rule.enabled,
    });
    setButtonAction(action);
    setButtonCustomUrl(customUrl);
    setFormError(null);
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    const resolvedUrl = buttonAction === "__custom_url__" ? buttonCustomUrl.trim() : buttonAction;
    const payload: AutoBroadcastRulePayload = {
      ...form,
      subject: form.subject?.trim() || null,
      buttonText: form.buttonText?.trim() || null,
      buttonUrl: resolvedUrl || null,
    };
    if (!payload.name.trim()) {
      setFormError("Укажите название правила");
      return;
    }
    if (!payload.message.trim()) {
      setFormError("Укажите текст сообщения");
      return;
    }
    setFormSaving(true);
    try {
      if (editingId) {
        await api.updateAutoBroadcastRule(token, editingId, payload);
      } else {
        await api.createAutoBroadcastRule(token, payload);
      }
      closeForm();
      loadRules();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Ошибка сохранения");
    } finally {
      setFormSaving(false);
    }
  }

  async function handleDelete(ruleId: string) {
    if (!confirm("Удалить правило?")) return;
    try {
      await api.deleteAutoBroadcastRule(token, ruleId);
      loadRules();
    } catch {
      // ignore
    }
  }

  function formatRunResult(r: { sent: number; skipped: number; errors: string[] }): string {
    const parts: string[] = [];
    if (r.sent > 0) parts.push(`✅ Отправлено: ${r.sent}`);
    if (r.skipped > 0) parts.push(`⏭ Пропущено (бот заблокирован): ${r.skipped}`);
    if (r.errors.length > 0) parts.push(`❌ Ошибки: ${r.errors.join("; ")}`);
    if (parts.length === 0) parts.push("Нет подходящих получателей");
    return parts.join("\n");
  }

  async function handleRunAll() {
    setRunAllLoading(true);
    try {
      const { results } = await api.runAutoBroadcastAll(token);
      const totalSent = results.reduce((s, r) => s + r.sent, 0);
      const totalSkipped = results.reduce((s, r) => s + r.skipped, 0);
      const totalErrors = results.reduce((s, r) => s + r.errors.length, 0);
      loadRules();
      alert(`Отправлено: ${totalSent}, пропущено: ${totalSkipped}${totalErrors > 0 ? `, ошибок: ${totalErrors}` : ""}`);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Ошибка запуска");
    } finally {
      setRunAllLoading(false);
    }
  }

  async function handleRunOne(ruleId: string) {
    setRunningRuleId(ruleId);
    try {
      const result = await api.runAutoBroadcastRule(token, ruleId);
      loadRules();
      alert(formatRunResult(result));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Ошибка запуска");
    } finally {
      setRunningRuleId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Авто-рассылка</h1>
          <p className="text-muted-foreground">
            Настраиваемые правила: после регистрации, неактивность, без платежа — чтобы не терять клиентов
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleRunAll} disabled={runAllLoading || rules.length === 0}>
            {runAllLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            Запустить все
          </Button>
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Добавить правило
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Расписание
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Cron: минута час день месяц день_недели. Например <code className="rounded bg-muted px-1">0 9 * * *</code> — каждый день в 9:00. Пусто = по умолчанию 9:00.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveSchedule} className="flex flex-wrap items-end gap-3">
            <div className="min-w-[200px] flex-1 space-y-2">
              <Label htmlFor="schedule-cron">Выражение cron</Label>
              <Input
                id="schedule-cron"
                value={scheduleCron}
                onChange={(e) => setScheduleCron(e.target.value)}
                placeholder="0 9 * * *"
                className="font-mono"
              />
            </div>
            <Button type="submit" disabled={scheduleSaving}>
              {scheduleSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Сохранить расписание
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5" />
            Правила
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center gap-2 text-muted-foreground py-8">
              <Loader2 className="h-5 w-5 animate-spin" />
              Загрузка…
            </div>
          ) : rules.length === 0 ? (
            <p className="text-muted-foreground py-6">Правил пока нет. Добавьте первое.</p>
          ) : (
            <div className="space-y-3">
              {rules.map((rule) => (
                <div
                  key={rule.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">{rule.name}</span>
                      {!rule.enabled && (
                        <span className="rounded bg-muted px-2 py-0.5 text-xs">выкл</span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {TRIGGER_LABELS[rule.triggerType]}
                      {rule.triggerType === "subscription_ending_soon"
                        ? ` · за ${rule.delayDays} дн. до окончания`
                        : ` · через ${rule.delayDays} дн.`}{" "}
                      · {CHANNEL_LABELS[rule.channel]}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Отправлено: {rule.sentCount ?? 0} · Сейчас подходят: {eligibleCounts[rule.id] ?? "—"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRunOne(rule.id)}
                      disabled={runningRuleId !== null}
                    >
                      {runningRuleId === rule.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Play className="h-4 w-4" />
                      )}
                      Запустить
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => openEdit(rule)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(rule.id)} className="text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showForm} onOpenChange={(open) => !open && closeForm()}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Редактировать правило" : "Новое правило"}</DialogTitle>
            <DialogDescription className="sr-only">Форма правила авторассылки</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4 py-4">
              {formError && (
                <p className="text-sm text-destructive rounded bg-destructive/10 px-3 py-2">{formError}</p>
              )}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Название</Label>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="Например: Напоминание через 3 дня"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Триггер</Label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={form.triggerType}
                    onChange={(e) => {
                    const t = e.target.value as AutoBroadcastTriggerType;
                    setForm((f) => ({
                      ...f,
                      triggerType: t,
                      delayDays:
                        t === "subscription_ending_soon"
                          ? Math.max(1, Math.min(30, f.delayDays))
                          : f.delayDays,
                    }));
                  }}
                  >
                    {(Object.keys(TRIGGER_LABELS) as AutoBroadcastTriggerType[]).map((t) => (
                      <option key={t} value={t}>
                        {TRIGGER_LABELS[t]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>
                    {form.triggerType === "subscription_ending_soon"
                      ? "За сколько дней до окончания (1–30)"
                      : "Через сколько дней (0–365)"}
                  </Label>
                  <Input
                    type="number"
                    min={form.triggerType === "subscription_ending_soon" ? 1 : 0}
                    max={form.triggerType === "subscription_ending_soon" ? 30 : 365}
                    value={form.delayDays}
                    onChange={(e) => {
                      const v = Number(e.target.value) || 0;
                      const min = form.triggerType === "subscription_ending_soon" ? 1 : 0;
                      const max = form.triggerType === "subscription_ending_soon" ? 30 : 365;
                      setForm((f) => ({ ...f, delayDays: Math.max(min, Math.min(max, v)) }));
                    }}
                  />
                  {form.triggerType === "subscription_ending_soon" && (
                    <p className="text-xs text-muted-foreground">
                      Создайте несколько правил (например, за 7, за 3, за 1 день) — рассылка будет с нужным текстом.
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Канал</Label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={form.channel}
                    onChange={(e) => setForm((f) => ({ ...f, channel: e.target.value as "telegram" | "email" | "both" }))}
                  >
                    <option value="telegram">Telegram</option>
                    <option value="email">Email</option>
                    <option value="both">Telegram и Email</option>
                  </select>
                </div>
              </div>
              {(form.channel === "email" || form.channel === "both") && (
                <div className="space-y-2">
                  <Label>Тема письма (для email)</Label>
                  <Input
                    value={form.subject ?? ""}
                    onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
                    placeholder="Тема письма"
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label>Текст сообщения</Label>
                <textarea
                  className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={form.message}
                  onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                  placeholder="Текст для Telegram / email (до 4096 символов)"
                  maxLength={4096}
                />
                <p className="text-xs text-muted-foreground">{form.message.length} / 4096</p>
              </div>
              {(form.channel === "telegram" || form.channel === "both") && (
                <div className="space-y-3 rounded-lg border border-dashed p-4">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <MousePointerClick className="h-4 w-4" />
                    Кнопка под сообщением (только Telegram)
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1">
                      <Label>Действие кнопки</Label>
                      <select
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        value={buttonAction}
                        onChange={(e) => setButtonAction(e.target.value)}
                      >
                        {BUTTON_ACTIONS.map((a) => (
                          <option key={a.value} value={a.value}>{a.label}</option>
                        ))}
                      </select>
                    </div>
                    {buttonAction && (
                      <div className="space-y-1">
                        <Label>Текст кнопки</Label>
                        <Input
                          value={form.buttonText ?? ""}
                          onChange={(e) => setForm((f) => ({ ...f, buttonText: e.target.value }))}
                          placeholder="Открыть тарифы"
                          maxLength={64}
                        />
                      </div>
                    )}
                  </div>
                  {buttonAction === "__custom_url__" && (
                    <div className="space-y-1">
                      <Label>Ссылка (URL)</Label>
                      <Input
                        value={buttonCustomUrl}
                        onChange={(e) => setButtonCustomUrl(e.target.value)}
                        placeholder="https://example.com/tariffs"
                        maxLength={500}
                      />
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Выберите действие — под сообщением появится inline-кнопка, открывающая выбранный раздел бота.
                  </p>
                </div>
              )}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="form-enabled"
                  checked={form.enabled}
                  onChange={(e) => setForm((f) => ({ ...f, enabled: e.target.checked }))}
                  className="rounded border-input"
                />
                <Label htmlFor="form-enabled">Включено (участвует в запуске «Запустить все»)</Label>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={closeForm}>
                  Отмена
                </Button>
                <Button type="submit" disabled={formSaving}>
                  {formSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {editingId ? "Сохранить" : "Создать"}
                </Button>
              </DialogFooter>
            </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
