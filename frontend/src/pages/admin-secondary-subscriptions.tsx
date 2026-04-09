import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/auth";
import {
  api,
  type AdminSecondarySubscriptionFilters,
  type AdminSecondarySubscriptionsResponse,
  type AdminSecondarySubscriptionDetail,
  type TariffRecord,
  type ClientRecord,
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  Search,
  RefreshCw,
  Eye,
  Trash2,
  Gift,
  ShoppingCart,
  CheckCircle2,
  Mail,
  Send,
  XCircle,
  Clock,
  Trash,
  Copy,
  Check,
  User,
  Activity,
  Plus,
  Loader2,
} from "lucide-react";

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
      className="flex h-9 w-full rounded-md border border-white/10 bg-white/5 backdrop-blur-xl px-3 py-1 text-sm shadow-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value} className="bg-background text-foreground">
          {o.label}
        </option>
      ))}
    </select>
  );
}

function giftStatusBadge(status: string | null): { label: string; className: string } {
  switch (status) {
    case null:
      return { label: "Своя", className: "bg-green-500/20 text-green-600 dark:text-green-400 border border-green-500/30" };
    case "GIFT_RESERVED":
      return { label: "Резерв", className: "bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 border border-yellow-500/30" };
    case "GIFT_CODE_ACTIVE":
      return { label: "Код активен", className: "bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/30" };
    case "GIFTED":
      return { label: "Подарена", className: "bg-purple-500/20 text-purple-600 dark:text-purple-400 border border-purple-500/30" };
    default:
      return { label: status, className: "bg-white/10 text-muted-foreground border border-white/20" };
  }
}

const EVENT_LABELS: Record<string, { icon: React.ReactNode; label: string }> = {
  PURCHASED: { icon: <ShoppingCart className="h-4 w-4" />, label: "Подписка куплена" },
  ACTIVATED_SELF: { icon: <CheckCircle2 className="h-4 w-4" />, label: "Добавлена в профиль" },
  CODE_CREATED: { icon: <Gift className="h-4 w-4" />, label: "Код создан" },
  GIFT_SENT: { icon: <Send className="h-4 w-4" />, label: "Подарок отправлен" },
  GIFT_RECEIVED: { icon: <Mail className="h-4 w-4" />, label: "Подарок получен" },
  CODE_CANCELLED: { icon: <XCircle className="h-4 w-4" />, label: "Код отменен" },
  CODE_EXPIRED: { icon: <Clock className="h-4 w-4" />, label: "Код истек" },
  DELETED: { icon: <Trash className="h-4 w-4" />, label: "Удалена" },
};

export function AdminSecondarySubscriptionsPage() {
  const { state } = useAuth();
  const token = state.accessToken!;
  const [searchParams, setSearchParams] = useSearchParams();
  const initialSearch = searchParams.get("search")?.trim() ?? "";
  
  const [data, setData] = useState<AdminSecondarySubscriptionsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [filters, setFilters] = useState<AdminSecondarySubscriptionFilters>({
    page: 1,
    limit: 20,
    search: initialSearch || undefined,
  });
  
  const [searchInput, setSearchInput] = useState(initialSearch);
  
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [detailId, setDetailId] = useState<string | null>(null);
  const [detailData, setDetailData] = useState<AdminSecondarySubscriptionDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // ── Create Gift Code Dialog State ──
  const [createOpen, setCreateOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [createClientSearch, setCreateClientSearch] = useState("");
  const [createClients, setCreateClients] = useState<ClientRecord[]>([]);
  const [createClientsLoading, setCreateClientsLoading] = useState(false);
  const [createSelectedClient, setCreateSelectedClient] = useState<ClientRecord | null>(null);
  const [createTariffs, setCreateTariffs] = useState<TariffRecord[]>([]);
  const [createSelectedTariff, setCreateSelectedTariff] = useState<string>("");
  const [createMessage, setCreateMessage] = useState("");
  const [createResult, setCreateResult] = useState<{ code: string; expiresAt: string } | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);

  const fetchItems = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      const res = await api.getSecondarySubscriptions(token, filters);
      setData(res);
      setSelectedIds(new Set());
    } catch (err) {
      console.error("Failed to fetch secondary subscriptions", err);
    } finally {
      setLoading(false);
    }
  }, [token, filters]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleSearch = () => {
    const nextSearch = searchInput.trim();
    setFilters((prev) => ({ ...prev, search: nextSearch || undefined, page: 1 }));
    setSearchParams((prev) => {
      const p = new URLSearchParams(prev);
      if (nextSearch) p.set("search", nextSearch);
      else p.delete("search");
      return p;
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleSearch();
  };

  const handleFilterChange = <K extends keyof AdminSecondarySubscriptionFilters>(key: K, value: AdminSecondarySubscriptionFilters[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value, page: 1 }));
  };

  const handleResetFilters = () => {
    setSearchInput("");
    setFilters({ page: 1, limit: 20 });
    setSearchParams((prev) => {
      const p = new URLSearchParams(prev);
      p.delete("search");
      return p;
    });
  };

  const toggleSelectAll = () => {
    if (!data) return;
    if (selectedIds.size === data.items.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(data.items.map((item) => item.id)));
    }
  };

  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const handleDeleteSelected = async () => {
    if (!token) return;
    if (!confirm(`Удалить ${selectedIds.size} подписок? Это действие нельзя отменить.`)) return;
    
    try {
      await api.deleteSecondarySubscriptionsBulk(token, Array.from(selectedIds));
      await fetchItems();
    } catch (err) {
      console.error("Failed to bulk delete", err);
      alert("Ошибка при удалении");
    }
  };

  const handleDeleteSingle = async (id: string) => {
    if (!token) return;
    if (!confirm("Удалить эту подписку?")) return;
    try {
      await api.deleteSecondarySubscription(token, id);
      await fetchItems();
    } catch (err) {
      console.error("Failed to delete", err);
      alert("Ошибка при удалении");
    }
  };

  const openDetail = async (id: string) => {
    setDetailId(id);
    if (!token) return;
    setDetailLoading(true);
    setDetailData(null);
    try {
      const res = await api.getSecondarySubscription(token, id);
      setDetailData(res);
    } catch (err) {
      console.error("Failed to fetch detail", err);
    } finally {
      setDetailLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(text);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  // ── Create Gift Code Handlers ──

  const openCreateDialog = async () => {
    setCreateOpen(true);
    setCreateSelectedClient(null);
    setCreateSelectedTariff("");
    setCreateMessage("");
    setCreateResult(null);
    setCreateError(null);
    setCreateClientSearch("");
    setCreateClients([]);

    // Load tariffs
    try {
      const res = await api.getTariffs(token);
      setCreateTariffs(res.items);
    } catch {
      setCreateTariffs([]);
    }
  };

  const searchClients = async () => {
    if (!createClientSearch.trim()) return;
    setCreateClientsLoading(true);
    try {
      const res = await api.getClients(token, 1, 10, { search: createClientSearch.trim() });
      setCreateClients(res.items);
    } catch {
      setCreateClients([]);
    } finally {
      setCreateClientsLoading(false);
    }
  };

  const handleCreateSubmit = async () => {
    if (!createSelectedClient || !createSelectedTariff) return;
    setCreateLoading(true);
    setCreateError(null);
    try {
      const result = await api.adminCreateGiftCode(token, {
        clientId: createSelectedClient.id,
        tariffId: createSelectedTariff,
        giftMessage: createMessage.trim() || undefined,
      });
      setCreateResult({ code: result.code, expiresAt: result.expiresAt });
      fetchItems(); // refresh list
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Ошибка создания подарочного кода");
    } finally {
      setCreateLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Дополнительные подписки</h1>
        <Button onClick={openCreateDialog} className="gap-2">
          <Plus className="h-4 w-4" />
          Создать подарок
        </Button>
      </div>

      <Card className="border-white/10 bg-white/5 backdrop-blur-md">
        <CardHeader className="pb-4">
          <CardTitle>Фильтры</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-2">
              <Label>Поиск (Email / Telegram)</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Поиск по владельцу..."
                  className="pl-9 bg-white/5 border-white/10"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                />
              </div>
            </div>
            
            <div className="w-full sm:w-64 space-y-2">
              <Label>Статус подарка</Label>
              <Select
                value={filters.giftStatus || ""}
                onChange={(v) => handleFilterChange("giftStatus", v || undefined)}
                options={[
                  { value: "", label: "Все" },
                  { value: "null", label: "Своя (не подарена)" },
                  { value: "GIFT_RESERVED", label: "Резерв" },
                  { value: "GIFT_CODE_ACTIVE", label: "Код активен" },
                  { value: "GIFTED", label: "Подарена" },
                ]}
              />
            </div>

            <div className="flex gap-2">
              <Button variant="secondary" onClick={handleSearch} className="bg-white/10 hover:bg-white/20">
                <Search className="mr-2 h-4 w-4" />
                Найти
              </Button>
              <Button variant="ghost" onClick={handleResetFilters}>
                Сброс
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-white/10 bg-white/5 backdrop-blur-md overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-white/10 bg-white/5">
          <div className="flex items-center gap-2">
            {selectedIds.size > 0 && (
              <Button variant="destructive" size="sm" onClick={handleDeleteSelected}>
                <Trash2 className="mr-2 h-4 w-4" />
                Удалить выбранные ({selectedIds.size})
              </Button>
            )}
          </div>
          <Button variant="ghost" size="sm" onClick={fetchItems} disabled={loading}>
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-white/5 border-b border-white/10">
              <tr>
                <th className="px-4 py-3 w-10">
                  <Checkbox
                    checked={data?.items.length ? selectedIds.size === data.items.length : false}
                    onCheckedChange={toggleSelectAll}
                  />
                </th>
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">Владелец</th>
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">Тариф</th>
                <th className="px-4 py-3">Статус подарка</th>
                <th className="px-4 py-3">Получатель</th>
                <th className="px-4 py-3">Код</th>
                <th className="px-4 py-3">Создана</th>
                <th className="px-4 py-3 text-right">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center text-muted-foreground">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 opacity-50" />
                    Загрузка...
                  </td>
                </tr>
              ) : data?.items.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center text-muted-foreground">
                    <Gift className="h-8 w-8 mx-auto mb-2 opacity-20" />
                    Дополнительные подписки не найдены
                  </td>
                </tr>
              ) : (
                data?.items.map((item) => {
                  const badge = giftStatusBadge(item.giftStatus);
                  const ownerName = item.owner.telegramUsername ? `@${item.owner.telegramUsername}` : item.owner.email || item.owner.telegramId;
                  const giftedName = item.giftedToClient?.telegramUsername ? `@${item.giftedToClient.telegramUsername}` : item.giftedToClient?.email || "—";
                  
                  return (
                    <tr key={item.id} className="hover:bg-white/5 transition-colors group cursor-pointer" onClick={(e) => {
                      if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('[role="checkbox"]')) return;
                      openDetail(item.id);
                    }}>
                      <td className="px-4 py-3">
                        <Checkbox
                          checked={selectedIds.has(item.id)}
                          onCheckedChange={() => toggleSelect(item.id)}
                        />
                      </td>
                      <td className="px-4 py-3 font-mono text-xs opacity-70">
                        {item.id.substring(0, 8)}
                      </td>
                      <td className="px-4 py-3">
                        {ownerName}
                      </td>
                      <td className="px-4 py-3 font-medium">
                        #{item.subscriptionIndex}
                      </td>
                      <td className="px-4 py-3">
                        {item.tariff?.name || "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn("px-2 py-1 rounded-full text-xs font-medium", badge.className)}>
                          {badge.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 opacity-70">
                        {giftedName}
                      </td>
                      <td className="px-4 py-3">
                        {item.latestGiftCode ? (
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs bg-black/20 px-2 py-1 rounded border border-white/5">
                              {item.latestGiftCode.code}
                            </span>
                            <button
                              onClick={() => copyToClipboard(item.latestGiftCode!.code)}
                              className="text-muted-foreground hover:text-foreground transition-colors"
                            >
                              {copiedCode === item.latestGiftCode.code ? (
                                <Check className="h-3 w-3 text-green-500" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                            </button>
                          </div>
                        ) : "—"}
                      </td>
                      <td className="px-4 py-3 text-xs opacity-70">
                        {new Date(item.createdAt).toLocaleDateString("ru-RU")}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openDetail(item.id)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleDeleteSingle(item.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {data && data.totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t border-white/10 bg-black/20">
            <span className="text-sm text-muted-foreground">
              Страница {data.page} из {data.totalPages}
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="bg-white/5 border-white/10"
                disabled={data.page <= 1}
                onClick={() => setFilters((p) => ({ ...p, page: p.page! - 1 }))}
              >
                Назад
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="bg-white/5 border-white/10"
                disabled={data.page >= data.totalPages}
                onClick={() => setFilters((p) => ({ ...p, page: p.page! + 1 }))}
              >
                Вперед
              </Button>
            </div>
          </div>
        )}
      </Card>

      <Dialog open={!!detailId} onOpenChange={(o) => !o && setDetailId(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-card/80 backdrop-blur-2xl border-white/10 shadow-2xl">
          <DialogHeader>
            <DialogTitle>Подписка #{detailData?.subscriptionIndex}</DialogTitle>
            <DialogDescription className="font-mono text-xs opacity-50">
              {detailId}
            </DialogDescription>
          </DialogHeader>

          {detailLoading || !detailData ? (
            <div className="py-12 flex justify-center">
              <RefreshCw className="h-8 w-8 animate-spin opacity-50 text-primary" />
            </div>
          ) : (
            <div className="space-y-6">
              {/* Block 1: Подписка */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground block">Тариф</span>
                  <span className="text-sm font-medium">{detailData.tariff?.name || "—"}</span>
                </div>
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground block">Статус подарка</span>
                  <span className={cn("px-2 py-0.5 rounded text-xs font-medium inline-block", giftStatusBadge(detailData.giftStatus).className)}>
                    {giftStatusBadge(detailData.giftStatus).label}
                  </span>
                </div>
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground block">Создана</span>
                  <span className="text-sm">{new Date(detailData.createdAt).toLocaleDateString("ru-RU")}</span>
                </div>
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground block">Обновлена</span>
                  <span className="text-sm">{new Date(detailData.updatedAt).toLocaleDateString("ru-RU")}</span>
                </div>
              </div>

              {/* Block 2: Владелец */}
              <div className="p-4 rounded-xl bg-black/20 border border-white/5 space-y-3">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <User className="h-4 w-4 text-primary" /> Владелец
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-xs text-muted-foreground block mb-1">Telegram ID</span>
                    {detailData.owner.telegramId || "—"}
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground block mb-1">Username</span>
                    {detailData.owner.telegramUsername ? `@${detailData.owner.telegramUsername}` : "—"}
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground block mb-1">Email</span>
                    {detailData.owner.email || "—"}
                  </div>
                </div>
              </div>

              {/* Block 3: Remnawave */}
              <div className="p-4 rounded-xl bg-black/20 border border-white/5 space-y-3">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <Activity className="h-4 w-4 text-blue-400" /> Данные Remnawave
                </h3>
                {detailData.remnaData ? (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-xs text-muted-foreground block mb-1">Статус</span>
                      <span className={cn(
                        "px-2 py-0.5 rounded text-xs",
                        detailData.remnaData.status === "active" ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
                      )}>
                        {String(detailData.remnaData.status || "unknown")}
                      </span>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground block mb-1">Истекает</span>
                      {detailData.remnaData.expireAt 
                        ? new Date(String(detailData.remnaData.expireAt)).toLocaleDateString("ru-RU") 
                        : "—"}
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground block mb-1">Трафик</span>
                      {String(detailData.remnaData.usedTraffic || "0")} / {String(detailData.remnaData.trafficLimit || "∞")}
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground block mb-1">Устройства</span>
                      {String(detailData.remnaData.devices || "0")}
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">Нет данных Remnawave</div>
                )}
              </div>

              {/* Block 4: Подарочная информация */}
              {detailData.giftCodes && detailData.giftCodes.length > 0 && (
                <div className="p-4 rounded-xl bg-black/20 border border-white/5 space-y-3">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <Gift className="h-4 w-4 text-purple-400" /> Подарочные коды
                  </h3>
                  <div className="space-y-3">
                    {detailData.giftCodes.map((code) => (
                      <div key={code.id} className="p-3 bg-white/5 border border-white/5 rounded-lg text-sm grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono bg-black/30 px-2 py-1 rounded">{code.code}</span>
                          <span className={cn(
                            "text-xs px-2 py-0.5 rounded",
                            code.status === "ACTIVE" ? "bg-blue-500/20 text-blue-400" : 
                            code.status === "REDEEMED" ? "bg-purple-500/20 text-purple-400" : 
                            "bg-white/10 text-muted-foreground"
                          )}>
                            {code.status}
                          </span>
                        </div>
                        <div className="text-right text-xs text-muted-foreground flex flex-col justify-center">
                          {code.redeemedBy && (
                            <span>Активировал: {code.redeemedBy.telegramUsername ? `@${code.redeemedBy.telegramUsername}` : code.redeemedBy.email}</span>
                          )}
                          <span>Действует до: {new Date(code.expiresAt).toLocaleDateString("ru-RU")}</span>
                        </div>
                        {code.giftMessage && (
                          <div className="col-span-full mt-2 text-xs italic opacity-70 bg-black/20 p-2 rounded border-l-2 border-primary/50">
                            "{code.giftMessage}"
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Block 5: История */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <Clock className="h-4 w-4 text-orange-400" /> История
                </h3>
                <div className="space-y-4 pl-4 border-l border-white/10 ml-2">
                  {detailData.history.length === 0 ? (
                    <div className="text-sm text-muted-foreground -ml-4">Нет истории</div>
                  ) : (
                    detailData.history.map((event) => {
                      const evData = EVENT_LABELS[event.eventType] || { icon: <Activity className="h-4 w-4" />, label: event.eventType };
                      return (
                        <div key={event.id} className="relative -ml-[25px] flex items-start gap-4">
                          <div className="bg-card border border-white/10 rounded-full p-1.5 shadow-xl mt-0.5">
                            {evData.icon}
                          </div>
                          <div className="flex-1 bg-white/5 border border-white/10 rounded-lg p-3">
                            <div className="flex justify-between items-start mb-1">
                              <span className="text-sm font-medium">{evData.label}</span>
                              <span className="text-xs text-muted-foreground">
                                {new Date(event.createdAt).toLocaleString("ru-RU", { 
                                  day: '2-digit', month: '2-digit', year: 'numeric',
                                  hour: '2-digit', minute: '2-digit'
                                })}
                              </span>
                            </div>
                            {event.metadata && Object.keys(event.metadata).length > 0 && (
                              <pre className="text-[10px] text-muted-foreground bg-black/30 p-2 rounded mt-2 overflow-x-auto">
                                {JSON.stringify(event.metadata, null, 2)}
                              </pre>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ═══ Create Gift Code Dialog ═══ */}
      <Dialog open={createOpen} onOpenChange={(open) => { if (!open) setCreateOpen(false); }}>
        <DialogContent className="max-w-lg bg-card border-white/10">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Gift className="h-5 w-5 text-purple-400" /> Создать подарочный код
            </DialogTitle>
            <DialogDescription>
              Создаёт дополнительную подписку на выбранного клиента и генерирует подарочный код
            </DialogDescription>
          </DialogHeader>

          {createResult ? (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/30 text-center space-y-3">
                <CheckCircle2 className="h-8 w-8 text-green-400 mx-auto" />
                <p className="text-sm font-medium text-green-400">Подарочный код создан!</p>
                <div className="flex items-center justify-center gap-2">
                  <span className="font-mono text-lg bg-black/30 px-4 py-2 rounded-lg tracking-widest">{createResult.code}</span>
                  <Button size="sm" variant="ghost" onClick={() => copyToClipboard(createResult.code)}>
                    {copiedCode === createResult.code ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Действует до: {new Date(createResult.expiresAt).toLocaleString("ru-RU")}
                </p>
              </div>
              <Button className="w-full" onClick={() => setCreateOpen(false)}>
                Закрыть
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Step 1: Select Client */}
              <div className="space-y-2">
                <Label>Клиент (владелец)</Label>
                {createSelectedClient ? (
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-white/5 border border-white/10">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm flex-1">
                      {createSelectedClient.telegramUsername
                        ? `@${createSelectedClient.telegramUsername}`
                        : createSelectedClient.email || `ID: ${createSelectedClient.telegramId}`}
                    </span>
                    <Button size="sm" variant="ghost" onClick={() => setCreateSelectedClient(null)}>
                      <XCircle className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <Input
                        placeholder="Email или Telegram..."
                        className="bg-white/5 border-white/10"
                        value={createClientSearch}
                        onChange={(e) => setCreateClientSearch(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") searchClients(); }}
                      />
                      <Button variant="secondary" size="sm" onClick={searchClients} disabled={createClientsLoading} className="bg-white/10">
                        {createClientsLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                      </Button>
                    </div>
                    {createClients.length > 0 && (
                      <div className="max-h-40 overflow-y-auto rounded-lg border border-white/10 divide-y divide-white/5">
                        {createClients.map((c) => (
                          <button
                            key={c.id}
                            className="w-full text-left px-3 py-2 text-sm hover:bg-white/10 transition-colors flex items-center gap-2"
                            onClick={() => {
                              setCreateSelectedClient(c);
                              setCreateClients([]);
                            }}
                          >
                            <User className="h-3 w-3 text-muted-foreground" />
                            <span>{c.telegramUsername ? `@${c.telegramUsername}` : c.email || `TG: ${c.telegramId}`}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Step 2: Select Tariff */}
              <div className="space-y-2">
                <Label>Тариф</Label>
                <Select
                  value={createSelectedTariff}
                  onChange={setCreateSelectedTariff}
                  options={[
                    { value: "", label: "Выберите тариф" },
                    ...createTariffs.map((t) => ({
                      value: t.id,
                      label: `${t.name} (${t.durationDays}д · ${t.price} ${t.currency})`,
                    })),
                  ]}
                />
              </div>

              {/* Step 3: Gift Message */}
              <div className="space-y-2">
                <Label>Сообщение (необязательно)</Label>
                <Textarea
                  placeholder="Сообщение для получателя..."
                  className="bg-white/5 border-white/10 resize-none"
                  maxLength={200}
                  rows={2}
                  value={createMessage}
                  onChange={(e) => setCreateMessage(e.target.value)}
                />
                <p className="text-xs text-muted-foreground text-right">{createMessage.length}/200</p>
              </div>

              {createError && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-sm text-red-400">
                  {createError}
                </div>
              )}

              <Button
                className="w-full gap-2"
                disabled={!createSelectedClient || !createSelectedTariff || createLoading}
                onClick={handleCreateSubmit}
              >
                {createLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Gift className="h-4 w-4" />
                )}
                Создать подарочный код
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
