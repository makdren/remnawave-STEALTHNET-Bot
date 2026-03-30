import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/contexts/auth";
import { api } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Download, DollarSign, ShoppingCart, TrendingUp, Search, CalendarDays,
  RefreshCw, CreditCard, User, Package, Hash, X, Receipt, Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";

function fmtDate(s: string | null) {
  if (!s) return "—";
  try {
    return new Date(s).toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch {
    return s;
  }
}

function fmtMoney(n: number) {
  return new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 2, minimumFractionDigits: 2 }).format(n);
}

interface SaleItem {
  id: string;
  orderId: string;
  amount: number;
  currency: string;
  provider: string;
  status: string;
  tariffName: string | null;
  tariffId: string | null;
  clientId: string | null;
  clientEmail: string | null;
  clientTelegramId: string | null;
  clientTelegramUsername: string | null;
  paidAt: string | null;
  createdAt: string;
  metadata: string | null;
}

interface SalesData {
  items: SaleItem[];
  total: number;
  page: number;
  limit: number;
  totalAmount: number;
  totalCount: number;
  byCurrency: Record<string, { sum: number; count: number }>;
  byProvider: Record<string, number>;
}

const PROVIDERS: { value: string; label: string; color: string }[] = [
  { value: "", label: "Все", color: "" },
  { value: "balance", label: "Баланс", color: "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/20" },
  { value: "platega", label: "Platega", color: "bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/20" },
  { value: "yoomoney_form", label: "ЮMoney", color: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/20" },
  { value: "yookassa", label: "ЮKassa", color: "bg-violet-500/15 text-violet-700 dark:text-violet-400 border-violet-500/20" },
  { value: "heleket", label: "Heleket", color: "bg-teal-500/15 text-teal-700 dark:text-teal-400 border-teal-500/20" },
];

function providerLabel(p: string) {
  const found = PROVIDERS.find((x) => x.value === p);
  if (found) return found.label;
  if (p === "yoomoney") return "ЮMoney";
  return p;
}

function providerColor(p: string) {
  const found = PROVIDERS.find((x) => x.value === p);
  if (found) return found.color;
  if (p === "yoomoney") return "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/20";
  return "bg-muted text-muted-foreground border-border";
}

const DATE_PRESETS = [
  { label: "Сегодня", days: 0 },
  { label: "7 дней", days: 7 },
  { label: "30 дней", days: 30 },
  { label: "90 дней", days: 90 },
] as const;

export function SalesReportPage() {
  const { state } = useAuth();
  const token = state.accessToken;
  const [data, setData] = useState<SalesData | null>(null);
  const [loading, setLoading] = useState(true);

  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [provider, setProvider] = useState("");
  const [search, setSearch] = useState("");
  const [searchApplied, setSearchApplied] = useState("");
  const [page, setPage] = useState(1);
  const [activePreset, setActivePreset] = useState<number | null>(null);
  const limit = 50;

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await api.getSalesReport(token, {
        from: dateFrom || undefined,
        to: dateTo || undefined,
        provider: provider || undefined,
        search: searchApplied || undefined,
        page,
        limit,
      });
      setData(res);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [token, dateFrom, dateTo, provider, searchApplied, page]);

  useEffect(() => { load(); }, [load]);

  function applySearch() {
    setSearchApplied(search);
    setPage(1);
  }

  function clearFilters() {
    setDateFrom("");
    setDateTo("");
    setProvider("");
    setSearch("");
    setSearchApplied("");
    setActivePreset(null);
    setPage(1);
  }

  function applyPreset(days: number) {
    const to = new Date();
    const from = new Date();
    if (days > 0) from.setDate(from.getDate() - days);
    setDateFrom(from.toISOString().slice(0, 10));
    setDateTo(to.toISOString().slice(0, 10));
    setActivePreset(days);
    setPage(1);
  }

  function exportCSV() {
    if (!data?.items.length) return;
    const header = "Дата;Заказ;Клиент;Telegram;Тариф;Сумма;Валюта;Провайдер";
    const rows = data.items.map((r) =>
      [fmtDate(r.paidAt), r.orderId, r.clientEmail ?? "", r.clientTelegramUsername ?? r.clientTelegramId ?? "", r.tariffName ?? "", r.amount.toFixed(2), r.currency, r.provider].join(";"),
    );
    const csv = "\uFEFF" + header + "\n" + rows.join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sales-report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function deletePayment(id: string) {
    if (!token) return;
    if (!confirm("Удалить этот платёж? Это действие необратимо.")) return;
    try {
      await api.deleteSalePayment(token, id);
      load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Ошибка удаления");
    }
  }

  const totalPages = data ? Math.max(1, Math.ceil(data.total / limit)) : 1;
  const hasFilters = dateFrom || dateTo || provider || searchApplied;
  const avgAmount = data && data.totalCount > 0 ? data.totalAmount / data.totalCount : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Отчёты продаж</h1>
          <p className="text-muted-foreground mt-1">Все оплаченные платежи и пополнения</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={load} disabled={loading} className="gap-1.5">
            <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
            <span className="hidden sm:inline">Обновить</span>
          </Button>
          <Button variant="outline" size="sm" onClick={exportCSV} disabled={!data?.items.length} className="gap-1.5">
            <Download className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">CSV</span>
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      {data && (
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <DollarSign className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Выручка</p>
                <p className="text-lg font-bold truncate">{fmtMoney(data.totalAmount)}</p>
                {Object.keys(data.byCurrency).length > 1 && (
                  <div className="flex flex-wrap gap-x-2 mt-0.5">
                    {Object.entries(data.byCurrency).map(([cur, v]) => (
                      <span key={cur} className="text-[10px] text-muted-foreground">{fmtMoney(v.sum)} {cur}</span>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <ShoppingCart className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Продаж</p>
                <p className="text-lg font-bold">{data.totalCount}</p>
                <p className="text-[10px] text-muted-foreground">
                  {data.items.length < data.total ? `показано ${data.items.length}` : "все на стр."}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <TrendingUp className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Средний чек</p>
                <p className="text-lg font-bold">{fmtMoney(avgAmount)}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-2">По способу</p>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(data.byProvider).sort((a, b) => b[1] - a[1]).map(([prov, cnt]) => (
                  <span key={prov} className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium border", providerColor(prov))}>
                    {providerLabel(prov)} <span className="opacity-70">{cnt}</span>
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Search + Filters */}
      <div className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Email, Telegram, заказ, тариф…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && applySearch()}
              className="pl-9 pr-20"
            />
            <Button variant="secondary" size="sm" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 px-3 text-xs" onClick={applySearch}>
              Найти
            </Button>
          </div>

          {/* Date presets */}
          <div className="flex items-center gap-1.5">
            <CalendarDays className="h-4 w-4 text-muted-foreground shrink-0" />
            {DATE_PRESETS.map((p) => (
              <button
                key={p.days}
                onClick={() => applyPreset(p.days)}
                className={cn(
                  "rounded-full px-3 py-1.5 text-xs font-medium transition-colors border",
                  activePreset === p.days
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-muted/50 text-muted-foreground border-transparent hover:bg-muted",
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Provider pills */}
          <div className="flex items-center gap-1.5">
            <CreditCard className="h-4 w-4 text-muted-foreground shrink-0" />
            {PROVIDERS.map((p) => (
              <button
                key={p.value}
                onClick={() => { setProvider(p.value); setPage(1); }}
                className={cn(
                  "rounded-full px-3 py-1.5 text-xs font-medium transition-colors border",
                  provider === p.value
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-muted/50 text-muted-foreground border-transparent hover:bg-muted",
                )}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Custom date range */}
          <div className="flex items-center gap-1.5 ml-auto">
            <Input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setActivePreset(null); setPage(1); }} className="h-8 w-[130px] text-xs" />
            <span className="text-muted-foreground text-xs">—</span>
            <Input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setActivePreset(null); setPage(1); }} className="h-8 w-[130px] text-xs" />
          </div>

          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="h-7 gap-1 text-xs text-muted-foreground">
              <X className="h-3 w-3" /> Сбросить
            </Button>
          )}
        </div>
      </div>

      {/* Sales list */}
      <div className="space-y-2">
        {loading && !data ? (
          <div className="flex items-center justify-center min-h-[200px]">
            <RefreshCw className="h-8 w-8 animate-spin text-primary/60" />
          </div>
        ) : !data?.items.length ? (
          <div className="rounded-xl border border-dashed p-12 text-center">
            <Receipt className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
            <p className="text-muted-foreground">Платежи не найдены</p>
            {hasFilters && (
              <Button variant="link" size="sm" className="mt-2" onClick={clearFilters}>
                Сбросить фильтры
              </Button>
            )}
          </div>
        ) : (
          data.items.map((r) => (
            <div
              key={r.id}
              className="group relative flex items-center gap-4 rounded-xl border bg-card/50 p-4 transition-all hover:bg-accent/50 hover:shadow-md hover:border-primary/20"
            >
              {/* Amount circle */}
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <DollarSign className="h-5 w-5" />
              </div>

              {/* Main info */}
              <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-y-1 gap-x-6">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm">
                      {fmtMoney(r.amount)} <span className="text-xs font-normal text-muted-foreground">{r.currency}</span>
                    </span>
                    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium border", providerColor(r.provider))}>
                      {providerLabel(r.provider)}
                    </span>
                    {r.tariffName && (
                      <span className="inline-flex items-center gap-1 rounded-md bg-muted/60 px-2 py-0.5 text-[10px] text-muted-foreground">
                        <Package className="h-3 w-3" /> {r.tariffName}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground flex-wrap">
                    {r.clientTelegramUsername && (
                      <span className="inline-flex items-center gap-1">
                        <User className="h-3 w-3" /> @{r.clientTelegramUsername}
                      </span>
                    )}
                    {!r.clientTelegramUsername && r.clientEmail && (
                      <span className="inline-flex items-center gap-1">
                        <User className="h-3 w-3" /> {r.clientEmail}
                      </span>
                    )}
                    {!r.clientTelegramUsername && !r.clientEmail && r.clientTelegramId && (
                      <span className="inline-flex items-center gap-1">
                        <User className="h-3 w-3" /> TG: {r.clientTelegramId}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1">
                      <Hash className="h-3 w-3" />
                      <span className="font-mono select-all">{r.orderId}</span>
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs text-muted-foreground sm:justify-end">
                  <span className="inline-flex items-center gap-1">
                    <CalendarDays className="h-3 w-3" /> {fmtDate(r.paidAt)}
                  </span>
                </div>
              </div>

              <div className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  variant="ghost" size="icon"
                  className="h-8 w-8 text-destructive hover:bg-destructive/10"
                  onClick={() => deletePayment(r.id)}
                  title="Удалить платёж"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {data && totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            Стр. {page} из {totalPages} · {data.total} записей
          </span>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(1)} className="h-8 px-2">
              «
            </Button>
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="h-8 px-3">
              Назад
            </Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="h-8 px-3">
              Вперёд
            </Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(totalPages)} className="h-8 px-2">
              »
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
