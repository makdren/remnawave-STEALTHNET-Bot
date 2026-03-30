import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/contexts/auth";
import {
  api,
  type ClientRecord,
  type UpdateClientPayload,
  type UpdateClientRemnaPayload,
  type RemnaUserFull,
  type RemnaHwidDevice,
  type RemnaUserUsageResponse,
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Pencil, Trash2, Ban, ShieldCheck, Wifi, Ticket, KeyRound, Search,
  Copy, Check, Smartphone, Activity, User, Users, Settings, HardDrive, Link,
  RefreshCw,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

export function ClientsPage() {
  const { t } = useTranslation();
  const { state } = useAuth();
  const [data, setData] = useState<{ items: ClientRecord[]; total: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<ClientRecord | null>(null);
  const [editForm, setEditForm] = useState<UpdateClientPayload & Partial<UpdateClientRemnaPayload>>({});
  const [remnaData, setRemnaData] = useState<{ squads: { uuid: string; name?: string }[] }>({ squads: [] });
  const [clientRemnaSquads, setClientRemnaSquads] = useState<string[]>([]);
  const [settings, setSettings] = useState<{ activeLanguages: string[]; activeCurrencies: string[] } | null>(null);
  const [saving, setSaving] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [passwordForm, setPasswordForm] = useState<{ newPassword: string; confirm: string }>({ newPassword: "", confirm: "" });
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [savingPassword, setSavingPassword] = useState(false);
  const [search, setSearch] = useState("");
  const [searchApplied, setSearchApplied] = useState("");
  const [filterBlocked, setFilterBlocked] = useState<"all" | "blocked" | "active">("all");
  const token = state.accessToken!;

  useEffect(() => {
    api.getSettings(token).then((s) => setSettings({ activeLanguages: s.activeLanguages, activeCurrencies: s.activeCurrencies })).catch(() => {});
  }, [token]);

  const loadClients = () => {
    setLoading(true);
    const isBlocked =
      filterBlocked === "blocked" ? true : filterBlocked === "active" ? false : undefined;
    api.getClients(token, page, 20, { search: searchApplied || undefined, isBlocked }).then((r) => {
      setData({ items: r.items, total: r.total });
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => {
    loadClients();
  }, [token, page, searchApplied, filterBlocked]);

  const applySearch = () => {
    setSearchApplied(search);
    setPage(1);
  };

  useEffect(() => {
    if (editing?.remnawaveUuid) {
      api.getRemnaSquadsInternal(token).then((raw: unknown) => {
        const res = raw as { response?: { internalSquads?: { uuid: string; name?: string }[] } };
        const items = res?.response?.internalSquads ?? (Array.isArray(res) ? res : []);
        setRemnaData({ squads: Array.isArray(items) ? items : [] });
      }).catch(() => setRemnaData({ squads: [] }));
      api.getClientRemna(token, editing.id).then((raw: unknown) => {
        const res = raw as { response?: { activeInternalSquads?: Array<{ uuid?: string } | string> } };
        const arr = res?.response?.activeInternalSquads ?? [];
        const uuids = Array.isArray(arr) ? arr.map((s) => (typeof s === "string" ? s : s?.uuid)).filter((u): u is string => Boolean(u)) : [];
        setClientRemnaSquads(uuids);
      }).catch(() => setClientRemnaSquads([]));
    } else {
      setRemnaData({ squads: [] });
      setClientRemnaSquads([]);
    }
  }, [token, editing?.id, editing?.remnawaveUuid]);

  function openEdit(c: ClientRecord) {
    setEditing(c);
    setEditForm({
      email: c.email ?? undefined,
      preferredLang: c.preferredLang,
      preferredCurrency: c.preferredCurrency,
      balance: c.balance,
      isBlocked: c.isBlocked,
      blockReason: c.blockReason ?? undefined,
      referralPercent: c.referralPercent ?? undefined,
    });
    setActionMessage(null);
  }

  async function saveClient() {
    if (!editing) return;
    setSaving(true);
    setActionMessage(null);
    try {
      const updated = await api.updateClient(token, editing.id, {
        email: editForm.email ?? null,
        preferredLang: editForm.preferredLang,
        preferredCurrency: editForm.preferredCurrency,
        balance: editForm.balance,
        isBlocked: editForm.isBlocked,
        blockReason: editForm.blockReason ?? null,
        referralPercent: editForm.referralPercent ?? null,
      });
      setEditing(updated);
      setEditForm({});
      setActionMessage(t("admin.clients.saved"));
      loadClients();
    } catch (e) {
      setActionMessage(e instanceof Error ? e.message : t("admin.clients.error"));
    } finally {
      setSaving(false);
    }
  }

  async function saveRemnaLimits() {
    if (!editing?.remnawaveUuid) return;
    setSaving(true);
    setActionMessage(null);
    try {
      const payload: UpdateClientRemnaPayload = {};
      if (editForm.trafficLimitBytes !== undefined) payload.trafficLimitBytes = editForm.trafficLimitBytes;
      if (editForm.trafficLimitStrategy) payload.trafficLimitStrategy = editForm.trafficLimitStrategy;
      if (editForm.hwidDeviceLimit !== undefined) payload.hwidDeviceLimit = editForm.hwidDeviceLimit;
      if (editForm.expireAt) payload.expireAt = editForm.expireAt;
      await api.updateClientRemna(token, editing.id, payload);
      setActionMessage(t("admin.clients.remna_limits_updated"));
    } catch (e) {
      setActionMessage(e instanceof Error ? e.message : t("admin.clients.error"));
    } finally {
      setSaving(false);
    }
  }

  async function deleteClient(c: ClientRecord) {
    if (!confirm(`Удалить клиента ${c.email || c.telegramId || c.id}?`)) return;
    try {
      await api.deleteClient(token, c.id);
      if (editing?.id === c.id) setEditing(null);
      loadClients();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Ошибка удаления");
    }
  }

  async function remnaAction(
    name: string,
    fn: () => Promise<unknown>
  ) {
    setActionMessage(null);
    try {
      await fn();
      setActionMessage(name + " — ок");
      loadClients();
    } catch (e) {
      setActionMessage(name + ": " + (e instanceof Error ? e.message : "ошибка"));
    }
  }

  async function saveClientPassword() {
    if (!editing) return;
    if (passwordForm.newPassword.length < 8) {
      setPasswordMessage(t("admin.clients.password_min_8"));
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirm) {
      setPasswordMessage(t("admin.clients.passwords_mismatch"));
      return;
    }
    setPasswordMessage(null);
    setSavingPassword(true);
    try {
      await api.setClientPassword(token, editing.id, passwordForm.newPassword);
      setPasswordMessage(t("admin.clients.password_set"));
      setPasswordForm({ newPassword: "", confirm: "" });
    } catch (e) {
      setPasswordMessage(e instanceof Error ? e.message : t("admin.clients.error"));
    } finally {
      setSavingPassword(false);
    }
  }

  async function squadAdd(squadUuid: string) {
    if (!editing) return;
    await remnaAction(t("admin.clients.squad_added"), () => api.clientRemnaSquadAdd(token, editing.id, squadUuid));
    setClientRemnaSquads((prev) => (prev.includes(squadUuid) ? prev : [...prev, squadUuid]));
  }

  async function squadRemove(squadUuid: string) {
    if (!editing) return;
    await remnaAction(t("admin.clients.squad_removed"), () => api.clientRemnaSquadRemove(token, editing.id, squadUuid));
    setClientRemnaSquads((prev) => prev.filter((u) => u !== squadUuid));
  }

  const totalPages = data ? Math.ceil(data.total / 20) : 0;

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="h-8 w-8 animate-spin text-primary/60" />
          <span className="text-sm text-muted-foreground">{t("admin.clients.loading")}</span>
        </div>
      </div>
    );
  }
  if (!data) return <div className="text-destructive">{t("admin.clients.loading_error")}</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("admin.clients.title")}</h1>
          <p className="text-muted-foreground mt-1">
            {t("admin.clients.count_one", { total: data.total })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadClients} disabled={loading} className="gap-1.5">
            <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
            <span className="hidden sm:inline">{t("admin.common.refresh")}</span>
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder={t("admin.clients.search_placeholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && applySearch()}
            className="pl-9 pr-20"
          />
          <Button
            variant="secondary" size="sm"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 px-3 text-xs"
            onClick={applySearch}
          >
            {t("admin.clients.find")}
          </Button>
        </div>
        <div className="flex items-center gap-2">
          {(["all", "active", "blocked"] as const).map((f) => (
            <button
              key={f}
              onClick={() => { setFilterBlocked(f); setPage(1); }}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-medium transition-colors border",
                filterBlocked === f
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-muted/50 text-muted-foreground border-transparent hover:bg-muted"
              )}
            >
              {f === "all" ? t("admin.clients.all") : f === "active" ? t("admin.clients.active") : t("admin.clients.blocked")}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        {data.items.map((c) => (
          <div
            key={c.id}
            onClick={() => openEdit(c)}
            className={cn(
              "group relative flex items-center gap-4 rounded-xl border bg-card/50 p-4 cursor-pointer transition-all hover:bg-accent/50 hover:shadow-md hover:border-primary/20",
              c.isBlocked && "border-destructive/20 bg-destructive/5"
            )}
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <User className="h-5 w-5" />
            </div>

            <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-y-1 gap-x-6">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-sm truncate">
                    {c.telegramUsername ? `@${c.telegramUsername}` : c.email || `ID: ${c.telegramId ?? c.id.slice(0, 8)}`}
                  </span>
                  {c.isBlocked && (
                    <span className="inline-flex items-center rounded-full bg-destructive/10 text-destructive px-2 py-0.5 text-[10px] font-semibold border border-destructive/20">
                      <Ban className="h-3 w-3 mr-0.5" /> {t("admin.clients.block")}
                    </span>
                  )}
                  {c.activeNode && (
                    <span className="inline-flex items-center rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 text-[10px] font-medium border border-emerald-500/20">
                      {c.activeNode}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground flex-wrap">
                  {c.email && c.telegramUsername && <span>{c.email}</span>}
                  {c.telegramId && <span>TG: {c.telegramId}</span>}
                  <span>{new Date(c.createdAt).toLocaleDateString("ru")}</span>
                </div>
              </div>

              <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap sm:justify-end">
                <span className="inline-flex items-center gap-1 rounded-md bg-muted/60 px-2 py-1 font-medium">
                  {c.balance.toFixed(2)} {c.preferredCurrency.toUpperCase()}
                </span>
                {c.referralPercent != null && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-muted/60 px-2 py-1">
                    {t("admin.clients.ref_percent", { percent: c.referralPercent })}
                  </span>
                )}
                <span className="uppercase">{c.preferredLang}</span>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); openEdit(c); }} title="Редактировать">
                <Pencil className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={(e) => { e.stopPropagation(); deleteClient(c); }} title="Удалить">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}

        {data.items.length === 0 && (
          <div className="rounded-xl border border-dashed p-12 text-center">
            <Users className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
            <p className="text-muted-foreground">{t("admin.clients.loading_error")}</p>
            {searchApplied && (
              <Button variant="link" size="sm" className="mt-2" onClick={() => { setSearch(""); setSearchApplied(""); }}>
                {t("admin.common.refresh")}
              </Button>
            )}
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            {page} / {totalPages}
          </span>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(1)} className="h-8 px-2">
              «
            </Button>
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="h-8 px-3">
              {t("admin.common.back")}
            </Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="h-8 px-3">
              {t("admin.sales.next")}
            </Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(totalPages)} className="h-8 px-2">
              »
            </Button>
          </div>
        </div>
      )}

      {editing && (
        <ClientEditModal
          client={editing}
          editForm={editForm}
          setEditForm={setEditForm}
          saving={saving}
          actionMessage={actionMessage}
          remnaData={remnaData}
          clientRemnaSquads={clientRemnaSquads}
          activeLanguages={settings?.activeLanguages ?? []}
          activeCurrencies={settings?.activeCurrencies ?? []}
          onClose={() => {
            setEditing(null);
            setPasswordForm({ newPassword: "", confirm: "" });
            setPasswordMessage(null);
          }}
          onSave={saveClient}
          onSaveRemnaLimits={saveRemnaLimits}
          onRemnaAction={remnaAction}
          onSquadAdd={squadAdd}
          onSquadRemove={squadRemove}
          onSetPassword={saveClientPassword}
          passwordForm={passwordForm}
          setPasswordForm={setPasswordForm}
          passwordMessage={passwordMessage}
          savingPassword={savingPassword}
          token={token}
        />
      )}
    </div>
  );
}

function formatTrafficBytes(bytes: number | null | undefined): string {
  if (bytes == null || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / Math.pow(1024, i)).toFixed(i > 1 ? 2 : 0)} ${units[i]}`;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
    >
      {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  ACTIVE: { label: "Активен", color: "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20" },
  DISABLED: { label: "Отключён", color: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20" },
  LIMITED: { label: "Лимит", color: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20" },
  EXPIRED: { label: "Истёк", color: "bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20" },
};

const STRATEGY_LABELS: Record<string, string> = {
  NO_RESET: "Без сброса",
  DAY: "Ежедневно",
  WEEK: "Еженедельно",
  MONTH: "Ежемесячно",
  MONTH_ROLLING: "Скользящий месяц",
};

function ClientEditModal({
  client: editing,
  editForm,
  setEditForm,
  saving,
  actionMessage,
  remnaData,
  onClose,
  onSave,
  onSaveRemnaLimits,
  onRemnaAction,
  onSquadAdd,
  onSquadRemove,
  onSetPassword,
  passwordForm,
  setPasswordForm,
  passwordMessage,
  savingPassword,
  token,
  activeLanguages,
  activeCurrencies,
  clientRemnaSquads,
}: {
  client: ClientRecord;
  editForm: UpdateClientPayload & Partial<UpdateClientRemnaPayload>;
  setEditForm: React.Dispatch<React.SetStateAction<UpdateClientPayload & Partial<UpdateClientRemnaPayload>>>;
  saving: boolean;
  actionMessage: string | null;
  remnaData: { squads: { uuid: string; name?: string }[] };
  clientRemnaSquads: string[];
  activeLanguages: string[];
  activeCurrencies: string[];
  onClose: () => void;
  onSave: () => Promise<void>;
  onSaveRemnaLimits: () => Promise<void>;
  onRemnaAction: (name: string, fn: () => Promise<unknown>) => Promise<void>;
  onSquadAdd: (squadUuid: string) => Promise<void>;
  onSquadRemove: (squadUuid: string) => Promise<void>;
  onSetPassword: () => Promise<void>;
  passwordForm: { newPassword: string; confirm: string };
  setPasswordForm: React.Dispatch<React.SetStateAction<{ newPassword: string; confirm: string }>>;
  passwordMessage: string | null;
  savingPassword: boolean;
  token: string;
}) {
  const { t } = useTranslation();
  const [tab, setTab] = useState("profile");
  const [remnaUser, setRemnaUser] = useState<RemnaUserFull | null>(null);
  const [remnaLoading, setRemnaLoading] = useState(false);
  const [devices, setDevices] = useState<RemnaHwidDevice[]>([]);
  const [devicesTotal, setDevicesTotal] = useState(0);
  const [devicesLoading, setDevicesLoading] = useState(false);
  const [usageData, setUsageData] = useState<RemnaUserUsageResponse["response"] | null>(null);

  const loadRemnaUser = useCallback(() => {
    if (!editing.remnawaveUuid) return;
    setRemnaLoading(true);
    api.getClientRemna(token, editing.id).then((raw: unknown) => {
      const resp = (raw as Record<string, unknown>)?.response ?? raw;
      setRemnaUser(resp as RemnaUserFull);
    }).catch(() => {}).finally(() => setRemnaLoading(false));
  }, [token, editing.id, editing.remnawaveUuid]);

  const loadDevices = useCallback(() => {
    if (!editing.remnawaveUuid) return;
    setDevicesLoading(true);
    api.getClientRemnaDevices(token, editing.id).then((d) => {
      setDevices(d.response?.devices ?? []);
      setDevicesTotal(d.response?.total ?? 0);
    }).catch(() => {}).finally(() => setDevicesLoading(false));
  }, [token, editing.id, editing.remnawaveUuid]);

  const loadUsage = useCallback(() => {
    if (!editing.remnawaveUuid) return;
    api.getClientRemnaUsage(token, editing.id, 30).then((d) => {
      setUsageData(d.response ?? null);
    }).catch(() => {});
  }, [token, editing.id, editing.remnawaveUuid]);

  useEffect(() => {
    loadRemnaUser();
    loadDevices();
    loadUsage();
  }, [loadRemnaUser, loadDevices, loadUsage]);

  const deleteDevice = async (hwid: string) => {
    if (!confirm(t("admin.clients.delete_device_confirm"))) return;
    try {
      await api.deleteClientRemnaDevice(token, editing.id, hwid);
      loadDevices();
    } catch (e) {
      alert(e instanceof Error ? e.message : t("admin.clients.delete_error"));
    }
  };

  const trafficUsed = remnaUser?.userTraffic?.usedTrafficBytes ?? 0;
  const trafficLimit = remnaUser?.trafficLimitBytes ?? 0;
  const trafficLifetime = remnaUser?.userTraffic?.lifetimeUsedTrafficBytes ?? 0;
  const trafficPercent = trafficLimit > 0 ? Math.min((trafficUsed / trafficLimit) * 100, 100) : 0;

  const statusInfo = STATUS_MAP[remnaUser?.status ?? ""] ?? { label: remnaUser?.status ?? "—", color: "bg-muted" };

  const isOnline = remnaUser?.userTraffic?.onlineAt != null;
  const onlineAt = remnaUser?.userTraffic?.onlineAt;

  const totalUsageLast30 = usageData?.sparklineData?.reduce((a, b) => a + b, 0) ?? 0;

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-0 text-left">
          <DialogTitle className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="truncate">{editing.email || editing.telegramUsername ? `@${editing.telegramUsername}` : editing.telegramId || "Клиент"}</span>
                {editing.remnawaveUuid && (
                  <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium", statusInfo.color)}>
                    {statusInfo.label}
                  </span>
                )}
                {editing.isBlocked && (
                  <span className="inline-flex items-center rounded-full bg-red-500/10 text-red-700 dark:text-red-400 border border-red-500/20 px-2 py-0.5 text-[11px] font-medium">
                    {t("admin.clients.is_blocked")}
                  </span>
                )}
              </div>
              <div className="text-xs text-muted-foreground font-normal mt-0.5">
                {t("admin.clients.created")} {new Date(editing.createdAt).toLocaleString("ru")}
                {remnaUser?.shortUuid && <> &middot; <code className="text-[10px]">{remnaUser.shortUuid}</code></>}
              </div>
            </div>
          </DialogTitle>
          <DialogDescription className="sr-only">{t("admin.clients.modal_title")}</DialogDescription>
        </DialogHeader>

        {editing.remnawaveUuid && remnaUser && (
          <div className="px-6 pt-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-xl bg-muted/50 p-3 space-y-1">
                <div className="text-[11px] text-muted-foreground uppercase tracking-wider">{t("admin.clients.traffic")}</div>
                <div className="text-lg font-bold">{formatTrafficBytes(trafficUsed)}</div>
                {trafficLimit > 0 && (
                  <>
                    <div className="text-[11px] text-muted-foreground">из {formatTrafficBytes(trafficLimit)}</div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className={cn("h-full rounded-full transition-all",
                          trafficPercent > 90 ? "bg-red-500" : trafficPercent > 70 ? "bg-amber-500" : "bg-green-500"
                        )}
                        style={{ width: `${trafficPercent}%` }}
                      />
                    </div>
                  </>
                )}
                {trafficLimit === 0 && <div className="text-[11px] text-muted-foreground">{t("admin.clients.unlimited")}</div>}
              </div>
              <div className="rounded-xl bg-muted/50 p-3 space-y-1">
                <div className="text-[11px] text-muted-foreground uppercase tracking-wider">{t("admin.clients.traffic_30d")}</div>
                <div className="text-lg font-bold">{formatTrafficBytes(totalUsageLast30)}</div>
                <div className="text-[11px] text-muted-foreground">{t("admin.clients.total_traffic")} {formatTrafficBytes(trafficLifetime)}</div>
              </div>
              <div className="rounded-xl bg-muted/50 p-3 space-y-1">
                <div className="text-[11px] text-muted-foreground uppercase tracking-wider">{t("admin.clients.devices")}</div>
                <div className="text-lg font-bold">{devicesTotal}</div>
                <div className="text-[11px] text-muted-foreground">
                  {t("admin.clients.device_limit")} {remnaUser.hwidDeviceLimit != null ? remnaUser.hwidDeviceLimit : "—"}
                </div>
              </div>
              <div className="rounded-xl bg-muted/50 p-3 space-y-1">
                <div className="text-[11px] text-muted-foreground uppercase tracking-wider">{t("admin.clients.status")}</div>
                <div className="flex items-center gap-1.5">
                  <span className={cn("h-2 w-2 rounded-full", isOnline ? "bg-green-500 animate-pulse" : "bg-gray-400")} />
                  <span className="text-sm font-medium">{isOnline ? t("admin.clients.status_online") : t("admin.clients.status_offline")}</span>
                </div>
                <div className="text-[11px] text-muted-foreground">
                  {onlineAt ? `${t("admin.clients.last_seen")} ${new Date(onlineAt).toLocaleString("ru")}` :
                    remnaUser.userTraffic?.firstConnectedAt ? `${t("admin.clients.first_login")} ${new Date(remnaUser.userTraffic.firstConnectedAt).toLocaleDateString("ru")}` : t("admin.clients.no_data")}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="px-6 pt-4 pb-6">
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="w-full flex flex-wrap">
              <TabsTrigger value="profile" className="gap-1.5 text-xs">
                <User className="h-3.5 w-3.5" /> {t("admin.clients.info")}
              </TabsTrigger>
              {editing.remnawaveUuid && (
                <>
                  <TabsTrigger value="remna" className="gap-1.5 text-xs">
                    <Settings className="h-3.5 w-3.5" /> {t("admin.clients.remna")}
                  </TabsTrigger>
                  <TabsTrigger value="devices" className="gap-1.5 text-xs">
                    <Smartphone className="h-3.5 w-3.5" /> {t("admin.clients.devices")}
                    {devicesTotal > 0 && <span className="ml-1 rounded-full bg-primary/10 px-1.5 text-[10px] font-bold text-primary">{devicesTotal}</span>}
                  </TabsTrigger>
                  <TabsTrigger value="actions" className="gap-1.5 text-xs">
                    <Activity className="h-3.5 w-3.5" /> {t("admin.clients.actions")}
                  </TabsTrigger>
                </>
              )}
            </TabsList>

            {/* ────── Профиль ────── */}
            <TabsContent value="profile">
              <div className="space-y-5">
                <div className="rounded-xl bg-muted/30 border p-4 space-y-2 text-sm">
                  <div className="font-medium text-xs uppercase tracking-wider text-muted-foreground mb-2">{t("admin.clients.info")}</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Email</span>
                      <span>{editing.email || "—"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Telegram</span>
                      <span>{editing.telegramUsername ? `@${editing.telegramUsername}` : "—"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t("admin.clients.telegram_id")}</span>
                      <span className="flex items-center gap-1">
                        {editing.telegramId ?? "—"}
                        {editing.telegramId && <CopyButton text={String(editing.telegramId)} />}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t("admin.clients.panel_id")}</span>
                      <span className="flex items-center gap-1">
                        <code className="text-xs">{editing.id.slice(0, 12)}…</code>
                        <CopyButton text={editing.id} />
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t("admin.clients.ref_code")}</span>
                      <span className="flex items-center gap-1">
                        {editing.referralCode ? <code className="text-xs">{editing.referralCode}</code> : "—"}
                        {editing.referralCode && <CopyButton text={editing.referralCode} />}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t("admin.clients.referrals")}</span>
                      <span>{editing._count?.referrals ?? 0}</span>
                    </div>
                    {remnaUser?.subscriptionUrl && (
                      <div className="flex justify-between sm:col-span-2">
                        <span className="text-muted-foreground flex items-center gap-1"><Link className="h-3 w-3" /> {t("admin.clients.subscription")}</span>
                        <span className="flex items-center gap-1 max-w-[60%]">
                          <code className="text-xs truncate">{remnaUser.subscriptionUrl}</code>
                          <CopyButton text={remnaUser.subscriptionUrl} />
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input
                      value={editForm.email ?? ""}
                      onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value || undefined }))}
                      placeholder="email@example.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t("admin.clients.language")}</Label>
                    <Select
                      value={editForm.preferredLang ?? ""}
                      onChange={(v) => setEditForm((f) => ({ ...f, preferredLang: v }))}
                      options={(() => {
                        const langs = activeLanguages.length ? activeLanguages.map((l) => l.trim()) : ["ru", "en"];
                        const current = (editForm.preferredLang ?? editing.preferredLang ?? "").trim();
                        const set = new Set(langs);
                        if (current && !set.has(current)) set.add(current);
                        return [...set].map((l) => ({ value: l, label: l }));
                      })()}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t("admin.clients.currency")}</Label>
                    <Select
                      value={editForm.preferredCurrency ?? ""}
                      onChange={(v) => setEditForm((f) => ({ ...f, preferredCurrency: v }))}
                      options={(() => {
                        const currs = activeCurrencies.length ? activeCurrencies.map((c) => c.trim()) : ["usd", "rub"];
                        const current = (editForm.preferredCurrency ?? editing.preferredCurrency ?? "").trim();
                        const set = new Set(currs);
                        if (current && !set.has(current)) set.add(current);
                        return [...set].map((c) => ({ value: c, label: c.toUpperCase() }));
                      })()}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t("admin.clients.balance")}</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={editForm.balance ?? 0}
                      onChange={(e) => setEditForm((f) => ({ ...f, balance: Number(e.target.value) || 0 }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t("admin.clients.referral_percent")}</Label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={editForm.referralPercent ?? ""}
                      onChange={(e) =>
                        setEditForm((f) => ({
                          ...f,
                          referralPercent: e.target.value === "" ? undefined : Number(e.target.value),
                        }))
                      }
                      placeholder={t("admin.clients.referral_default")}
                    />
                  </div>
                  <div className="space-y-2 flex items-end gap-2">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={editForm.isBlocked ?? false}
                        onChange={(e) => setEditForm((f) => ({ ...f, isBlocked: e.target.checked }))}
                      />
                      <span>{t("admin.clients.is_blocked")}</span>
                    </label>
                  </div>
                  {(editForm.isBlocked ?? editing.isBlocked) && (
                    <div className="space-y-2 sm:col-span-2">
                      <Label>{t("admin.clients.block_reason")}</Label>
                      <Input
                        value={editForm.blockReason ?? ""}
                        onChange={(e) => setEditForm((f) => ({ ...f, blockReason: e.target.value || undefined }))}
                        placeholder="Причина"
                      />
                    </div>
                  )}
                </div>

                {actionMessage && <p className="text-sm text-muted-foreground">{actionMessage}</p>}
                <Button onClick={onSave} disabled={saving}>{saving ? t("admin.clients.saving") : t("admin.clients.save_profile")}</Button>

                <hr />
                <div>
                  <h3 className="font-semibold mb-2 flex items-center gap-2 text-sm">
                    <KeyRound className="h-4 w-4" /> {t("admin.clients.cabinet_password")}
                  </h3>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Input
                      type="password"
                      value={passwordForm.newPassword}
                      onChange={(e) => setPasswordForm((f) => ({ ...f, newPassword: e.target.value }))}
                      placeholder={t("admin.clients.new_password")}
                      autoComplete="new-password"
                    />
                    <Input
                      type="password"
                      value={passwordForm.confirm}
                      onChange={(e) => setPasswordForm((f) => ({ ...f, confirm: e.target.value }))}
                      placeholder={t("admin.clients.repeat_password")}
                      autoComplete="new-password"
                    />
                  </div>
                  {passwordMessage && (
                    <p className={cn("text-sm mt-2", passwordMessage === t("admin.clients.password_set") ? "text-green-600" : "text-destructive")}>
                      {passwordMessage}
                    </p>
                  )}
                  <Button
                    variant="outline" size="sm" className="mt-2"
                    onClick={onSetPassword}
                    disabled={savingPassword || !passwordForm.newPassword || passwordForm.newPassword.length < 8}
                  >
                    {savingPassword ? t("admin.clients.saving") : t("admin.clients.set_password")}
                  </Button>
                </div>
              </div>
            </TabsContent>

            {/* ────── Remna ────── */}
            {editing.remnawaveUuid && (
              <TabsContent value="remna">
                <div className="space-y-5">
                  {remnaLoading && <p className="text-muted-foreground text-sm">{t("admin.clients.loading_remna")}</p>}

                  {remnaUser && (
                    <div className="rounded-xl bg-muted/30 border p-4 space-y-2 text-sm">
                      <div className="font-medium text-xs uppercase tracking-wider text-muted-foreground mb-2">{t("admin.clients.remna_data")}</div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1.5">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Username</span>
                          <span className="flex items-center gap-1">
                            <code className="text-xs">{remnaUser.username}</code>
                            <CopyButton text={remnaUser.username} />
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">ID Remna</span>
                          <span className="font-mono text-xs">{remnaUser.id ?? "—"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">UUID</span>
                          <span className="flex items-center gap-1">
                            <code className="text-[10px]">{remnaUser.uuid.slice(0, 12)}…</code>
                            <CopyButton text={remnaUser.uuid} />
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Трафик</span>
                          <span>{formatTrafficBytes(trafficUsed)}{trafficLimit > 0 ? ` / ${formatTrafficBytes(trafficLimit)}` : " (безлимит)"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">{t("admin.clients.traffic_reset_strategy")}</span>
                          <span>{STRATEGY_LABELS[remnaUser.trafficLimitStrategy] ?? remnaUser.trafficLimitStrategy}</span>
                        </div>
                        {remnaUser.lastTrafficResetAt && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">{t("admin.clients.last_traffic_reset")}</span>
                            <span>{new Date(remnaUser.lastTrafficResetAt).toLocaleString("ru")}</span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">{t("admin.clients.expires")}</span>
                          <span>{remnaUser.expireAt ? new Date(remnaUser.expireAt).toLocaleString("ru") : "—"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">{t("admin.clients.created_in_remna")}</span>
                          <span>{new Date(remnaUser.createdAt).toLocaleString("ru")}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">{t("admin.clients.updated")}</span>
                          <span>{new Date(remnaUser.updatedAt).toLocaleString("ru")}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div>
                    <h3 className="font-semibold mb-3 text-sm">{t("admin.clients.limits_and_tariff")}</h3>
                    <div className="grid gap-4 sm:grid-cols-2 text-sm">
                      <div className="space-y-2">
                        <Label>{t("admin.clients.traffic_limit_gb")}</Label>
                        <Input
                          type="number" min={0} step={0.1}
                          value={
                            editForm.trafficLimitBytes !== undefined && editForm.trafficLimitBytes > 0
                              ? (editForm.trafficLimitBytes / (1024 ** 3)).toFixed(2).replace(/\.?0+$/, "")
                              : editForm.trafficLimitBytes === 0 ? "0" : ""
                          }
                          onChange={(e) => {
                            const v = e.target.value;
                            setEditForm((f) => ({
                              ...f,
                              trafficLimitBytes: v === "" ? undefined : (() => { const gb = parseFloat(v); return Number.isNaN(gb) ? undefined : Math.round(gb * 1024 ** 3); })(),
                            }));
                          }}
                          placeholder="0"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>{t("admin.clients.device_limit_hwid")}</Label>
                        <Input
                          type="number" min={0}
                          value={editForm.hwidDeviceLimit ?? ""}
                          onChange={(e) => setEditForm((f) => ({ ...f, hwidDeviceLimit: e.target.value === "" ? undefined : Number(e.target.value) }))}
                          placeholder="—"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>{t("admin.clients.traffic_reset")}</Label>
                        <Select
                          value={editForm.trafficLimitStrategy ?? ""}
                          onChange={(v) => setEditForm((f) => ({ ...f, trafficLimitStrategy: v as UpdateClientRemnaPayload["trafficLimitStrategy"] }))}
                          options={[
                            { value: "", label: "—" },
                            { value: "NO_RESET", label: t("admin.clients.reset_none") },
                            { value: "DAY", label: t("admin.clients.reset_day") },
                            { value: "WEEK", label: t("admin.clients.reset_week") },
                            { value: "MONTH", label: t("admin.clients.reset_month") },
                            { value: "MONTH_ROLLING", label: t("admin.clients.reset_rolling_month") },
                          ]}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>{t("admin.clients.expiry_date")}</Label>
                        <Input
                          type="datetime-local"
                          value={editForm.expireAt ? editForm.expireAt.slice(0, 16) : ""}
                          onChange={(e) => setEditForm((f) => ({ ...f, expireAt: e.target.value ? new Date(e.target.value).toISOString() : undefined }))}
                        />
                      </div>
                    </div>
                    <Button variant="outline" size="sm" className="mt-3" onClick={onSaveRemnaLimits} disabled={saving}>
                      {t("admin.clients.apply_limits")}
                    </Button>
                  </div>

                  {remnaData.squads.length > 0 && (
                    <div>
                      <h3 className="font-semibold mb-2 text-sm">{t("admin.clients.squads")}</h3>
                      <div className="flex flex-wrap gap-2">
                        {remnaData.squads.map((s) => {
                          const inSquad = clientRemnaSquads.includes(s.uuid);
                          return (
                            <span
                              key={s.uuid}
                              className={cn(
                                "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs border transition-colors",
                                inSquad ? "bg-primary/10 border-primary/30 text-primary" : "bg-muted border-transparent text-muted-foreground"
                              )}
                            >
                              <span className="font-medium">{s.name || s.uuid.slice(0, 8)}</span>
                              {inSquad ? (
                                <Button variant="ghost" size="sm" className="h-5 px-1 text-destructive text-[11px]" onClick={() => onSquadRemove(s.uuid)}>
                                  {t("admin.clients.remove")}
                                </Button>
                              ) : (
                                <Button variant="ghost" size="sm" className="h-5 px-1 text-[11px]" onClick={() => onSquadAdd(s.uuid)}>
                                  {t("admin.clients.add")}
                                </Button>
                              )}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {actionMessage && <p className="text-sm text-muted-foreground">{actionMessage}</p>}
                </div>
              </TabsContent>
            )}

            {/* ────── Устройства ────── */}
            {editing.remnawaveUuid && (
              <TabsContent value="devices">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-sm flex items-center gap-2">
                      <Smartphone className="h-4 w-4" />
                      {t("admin.clients.hwid_devices", { count: devicesTotal })}
                      {remnaUser?.hwidDeviceLimit != null && <span className="text-muted-foreground font-normal">{t("admin.clients.hwid_limit")} {remnaUser.hwidDeviceLimit}</span>}
                    </h3>
                    <Button variant="ghost" size="sm" onClick={loadDevices} disabled={devicesLoading}>
                      <RefreshCw className={cn("h-4 w-4", devicesLoading && "animate-spin")} />
                    </Button>
                  </div>

                  {devicesLoading && <p className="text-sm text-muted-foreground">{t("admin.clients.loading_short")}</p>}

                  {!devicesLoading && devices.length === 0 && (
                    <div className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">
                      <Smartphone className="h-8 w-8 mx-auto mb-2 opacity-40" />
                      <p className="text-sm">{t("admin.clients.no_registered_devices")}</p>
                    </div>
                  )}

                  {devices.length > 0 && (
                    <div className="space-y-2">
                      {devices.map((d) => (
                        <div key={d.id || d.hwid} className="flex items-center justify-between rounded-xl border bg-muted/30 p-3 gap-3">
                          <div className="min-w-0 space-y-0.5">
                            <div className="flex items-center gap-2">
                              <HardDrive className="h-4 w-4 text-muted-foreground shrink-0" />
                              <code className="text-xs truncate">{d.hwid}</code>
                              <CopyButton text={d.hwid} />
                            </div>
                            <div className="text-[11px] text-muted-foreground pl-6">
                              {d.platform && <span>{t("admin.clients.platform")} {d.platform}</span>}
                              {d.createdAt && <span> &middot; {new Date(d.createdAt).toLocaleString("ru")}</span>}
                            </div>
                            {d.userAgent && (
                              <div className="text-[10px] text-muted-foreground pl-6 truncate max-w-md" title={d.userAgent}>
                                {d.userAgent}
                              </div>
                            )}
                          </div>
                          <Button variant="ghost" size="sm" className="text-destructive shrink-0" onClick={() => deleteDevice(d.hwid)} title="Удалить устройство">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </TabsContent>
            )}

            {/* ────── Действия ────── */}
            {editing.remnawaveUuid && (
              <TabsContent value="actions">
                <div className="space-y-4">
                  <h3 className="font-semibold text-sm">{t("admin.clients.quick_actions")}</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <Button
                      variant="outline" className="justify-start gap-2"
                      onClick={() => onRemnaAction(t("admin.clients.subscription_revoked"), () => api.clientRemnaRevokeSubscription(token, editing.id))}
                    >
                      <Ticket className="h-4 w-4" /> {t("admin.clients.revoke_subscription")}
                    </Button>
                    <Button
                      variant="outline" className="justify-start gap-2 text-destructive border-destructive/30 hover:bg-destructive/10"
                      onClick={() => onRemnaAction(t("admin.clients.disabled"), () => api.clientRemnaDisable(token, editing.id))}
                    >
                      <Ban className="h-4 w-4" /> {t("admin.clients.disable_in_remna")}
                    </Button>
                    <Button
                      variant="outline" className="justify-start gap-2 text-green-700 dark:text-green-400 border-green-500/30 hover:bg-green-500/10"
                      onClick={() => onRemnaAction(t("admin.clients.enabled"), () => api.clientRemnaEnable(token, editing.id))}
                    >
                      <ShieldCheck className="h-4 w-4" /> {t("admin.clients.enable_in_remna")}
                    </Button>
                    <Button
                      variant="outline" className="justify-start gap-2"
                      onClick={() => onRemnaAction(t("admin.clients.traffic_reset_done"), () => api.clientRemnaResetTraffic(token, editing.id))}
                    >
                      <Wifi className="h-4 w-4" /> {t("admin.clients.reset_traffic")}
                    </Button>
                    <Button
                      variant="outline" className="justify-start gap-2"
                      onClick={() => { loadRemnaUser(); loadDevices(); loadUsage(); }}
                    >
                      <RefreshCw className="h-4 w-4" /> {t("admin.clients.refresh_data")}
                    </Button>
                  </div>
                  {actionMessage && <p className="text-sm text-muted-foreground mt-2">{actionMessage}</p>}

                  {usageData && usageData.sparklineData && usageData.sparklineData.some((v) => v > 0) && (
                    <div className="mt-4">
                      <h3 className="font-semibold text-sm mb-3">{t("admin.clients.traffic_30d_chart")}</h3>
                      <div className="flex items-end gap-px h-20 rounded-lg bg-muted/30 p-2 overflow-hidden">
                        {(() => {
                          const data = usageData.sparklineData;
                          const max = Math.max(...data, 1);
                          return data.map((v, i) => (
                            <div
                              key={i}
                              className="flex-1 bg-primary/60 hover:bg-primary rounded-t transition-colors min-w-[2px]"
                              style={{ height: `${Math.max((v / max) * 100, v > 0 ? 4 : 1)}%` }}
                              title={`${usageData.categories?.[i] ?? ""}: ${formatTrafficBytes(v)}`}
                            />
                          ));
                        })()}
                      </div>
                      <div className="flex justify-between text-[10px] text-muted-foreground mt-1 px-1">
                        <span>{usageData.categories?.[0] ?? ""}</span>
                        <span>{usageData.categories?.[usageData.categories.length - 1] ?? ""}</span>
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>
            )}
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Select({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <select
      className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}
