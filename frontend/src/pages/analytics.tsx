import { useEffect, useState, Fragment } from "react";
import { useAuth } from "@/contexts/auth";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { motion } from "framer-motion";
import {
  Loader2,
  TrendingUp,
  Users,
  DollarSign,
  ShoppingCart,
  Gift,
  Tag,
  Percent,
  UserPlus,
  Bot,
  Globe,
  Zap,
  Award,
  Wallet,
  Target,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Line,
  ComposedChart,
} from "recharts";

/* ── Animation variants — God-Tier Entrance ── */

const cardVariants = {
  hidden: { opacity: 0, y: 30, scale: 0.95, filter: "blur(10px)" },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    filter: "blur(0px)",
    transition: {
      delay: i * 0.08,
      duration: 0.85,
      ease: [0.22, 1, 0.36, 1],
    },
  }),
};

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

/* ── Terminal Container wrapper for major sections ── */

function GlassCard({
  children,
  animIndex = 0,
  className = "",
}: {
  children: React.ReactNode;
  animIndex?: number;
  className?: string;
}) {
  return (
    <motion.div variants={cardVariants} initial="hidden" animate="visible" custom={animIndex} className={`h-full ${className}`}>
      <Card className="group relative overflow-hidden !bg-white/10 dark:!bg-white/10 !bg-gradient-to-br !from-white/10 !to-white/5 !backdrop-blur-md !border-white/20 dark:!border-white/20 !text-white shadow-sm hover:!border-white/40 transition-all duration-500 font-mono h-full flex flex-col">
         <div className="flex-1 flex flex-col relative z-10 pt-4">
           {children}
         </div>
       </Card>
     </motion.div>
   );
}

function SectionHeader({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle: string;
}) {
  return (
    <motion.div
      className="flex items-center gap-4 mb-6 font-mono mt-8"
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
    >
      <motion.div
        className="relative flex items-center justify-center h-10 w-10 border border-white/20 dark:border-white/10 bg-white/10 dark:bg-white/5 shadow-[0_0_15px_hsl(var(--primary)/0.15)]"
        whileHover={{ scale: 1.1, rotate: 5 }}
        transition={{ type: "spring", stiffness: 400, damping: 15 }}
      >
        <Icon className="h-5 w-5 text-slate-800 dark:text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]" />
      </motion.div>
      <div>
        <h2 className="text-lg font-bold tracking-widest uppercase text-slate-800 dark:text-white dark:drop-shadow-[0_0_8px_rgba(255,255,255,0.5)] flex items-center gap-2">
          <span className="text-primary/50 hidden sm:inline">&gt;</span> {title}
        </h2>
        <p className="text-xs text-slate-500 dark:text-primary/60 uppercase tracking-widest">{subtitle}</p>
      </div>
    </motion.div>
  );
}

const COLORS = ["#6366f1", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#ec4899", "#14b8a6", "#f97316", "#84cc16"];

function fmt(n: number) {
  return new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 }).format(n);
}
function fmtDec(n: number) {
  return new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 2 }).format(n);
}

/* eslint-disable @typescript-eslint/no-explicit-any */
interface AnalyticsData {
  revenueSeries: { date: string; value: number }[];
  clientsSeries: { date: string; value: number }[];
  trialsSeries: { date: string; value: number }[];
  promoActsSeries: { date: string; value: number }[];
  promoUsagesSeries: { date: string; value: number }[];
  refCreditsSeries: { date: string; value: number }[];
  topTariffs: { name: string; count: number; revenue: number }[];
  providerSeries: { provider: string; amount: number }[];
  topReferrers: { id: string; name: string; referrals: number; earnings: number; l1: number; l2: number; l3: number; credits: number }[];
  campaignsStats: { source: string; campaign: string | null; registrations: number; trials: number; payments: number; revenue: number }[];
  promoGroupStats: { name: string; code: string; maxActivations: number; activations: number }[];
  promoCodeStats: { code: string; name: string; type: string; maxUses: number; usages: number }[];
  summary: {
    totalClients: number;
    activeClients: number;
    totalRevenue: number;
    totalPayments: number;
    totalReferralPaid: number;
    promoActivations: number;
    promoCodeUsages: number;
    clientsNew24h: number;
    clientsNew7d: number;
    clientsNew30d: number;
    botClients: number;
    siteClients: number;
    bothClients: number;
    trialUsedCount: number;
    trialToPaid: number;
    trialConversionRate: number;
    avgCheck: number;
    arpu: number;
    payingClients: number;
    payingPercent: number;
    rev7: number;
    rev30: number;
    cnt7: number;
    cnt30: number;
    paymentsPending: number;
    totalBalance: number;
    withReferrer: number;
  };
}

export function AnalyticsPage() {
  const { state } = useAuth();
  const token = state.accessToken;
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    api.getAnalytics(token).then(setData).catch(() => {}).finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data) {
    return <p className="text-sm text-destructive py-8">Ошибка загрузки аналитики</p>;
  }

  const s = data.summary;
  const revenueWeekly = aggregateByWeek(data.revenueSeries);
  const clientsWeekly = aggregateByWeek(data.clientsSeries);
  const trialsWeekly = aggregateByWeek(data.trialsSeries);
  const refCreditsWeekly = aggregateByWeek(data.refCreditsSeries);

  // Combine promo acts + usages for chart
  const promoWeekly = aggregateByWeekTwo(data.promoActsSeries, data.promoUsagesSeries, "Промо-ссылки", "Промокоды");

  return (
    <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="w-full space-y-8 px-4 sm:px-6 md:px-8 pt-6 sm:pt-10 md:pt-14 pb-8">
      {/* Page header — Terminal Style */}
      <motion.div
        initial={{ opacity: 0, y: -16, filter: "blur(8px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="font-mono"
      >
        <h1
          className="text-2xl font-bold tracking-widest uppercase text-slate-900 dark:text-white flex items-center gap-3"
          style={{ textShadow: "0 0 20px hsl(var(--primary)/0.3)" }}
        >
          <span className="text-primary/50">~/</span> Аналитика <motion.span animate={{opacity:[0,1]}} transition={{repeat:Infinity, duration:0.8}} className="w-4 h-6 bg-primary inline-block"></motion.span>
        </h1>
        <p className="text-slate-500 dark:text-primary/60 mt-2 text-xs tracking-widest uppercase">Полная статистика по всем направлениям</p>
        {/* Animated header underline */}
        <motion.div
          className="h-[1px] mt-4"
          style={{
            background: "linear-gradient(90deg, hsl(var(--primary)/0.8), transparent)",
          }}
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: "100%", opacity: 1 }}
          transition={{ delay: 0.4, duration: 1, ease: "easeOut" }}
        />
      </motion.div>

      {/* ═══ ОСНОВНЫЕ МЕТРИКИ ═══ */}
      <section>
        <SectionHeader icon={TrendingUp} title="Основные метрики" subtitle="Доходы и платежи" />
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-5">
          <MetricCard index={0} icon={DollarSign} label="Поступления" value={fmt(s.totalRevenue)} sub="без оплаты с баланса" color="text-green-500" />
          <MetricCard index={1} icon={DollarSign} label="Поступления 7 дн." value={fmt(s.rev7)} sub={`${s.cnt7} платежей`} color="text-green-500" />
          <MetricCard index={2} icon={DollarSign} label="Поступления 30 дн." value={fmt(s.rev30)} sub={`${s.cnt30} платежей`} color="text-green-500" />
          <MetricCard index={3} icon={ShoppingCart} label="Платежей" value={fmt(s.totalPayments)} sub={`${s.paymentsPending} ожидают`} color="text-blue-500" />
          <MetricCard index={4} icon={Target} label="Средний чек" value={fmtDec(s.avgCheck)} sub="на транзакцию" color="text-indigo-500" />
        </div>
      </section>

      {/* ═══ КЛИЕНТЫ ═══ */}
      <section>
        <SectionHeader icon={Users} title="Клиенты" subtitle="Статистика базы пользователей" />
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
          <MetricCard index={5} icon={Users} label="Всего клиентов" value={fmt(s.totalClients)} sub={`${s.activeClients} с подпиской`} color="text-blue-500" />
          <MetricCard index={6} icon={UserPlus} label="Новые 24ч / 7д / 30д" value={`${s.clientsNew24h} / ${s.clientsNew7d} / ${s.clientsNew30d}`} sub="регистрации" color="text-cyan-500" />
          <MetricCard index={7} icon={Bot} label="Только бот" value={fmt(s.botClients)} sub="клиентов" color="text-violet-500" />
          <MetricCard index={8} icon={Globe} label="Только сайт" value={fmt(s.siteClients)} sub="клиентов" color="text-orange-500" />
          <MetricCard index={9} icon={Users} label="Бот + Сайт" value={fmt(s.bothClients)} sub="клиентов" color="text-emerald-500" />
          <MetricCard index={10} icon={Wallet} label="Общий баланс" value={fmtDec(s.totalBalance)} sub="внутренние счета" color="text-amber-500" />
          <MetricCard index={11} icon={Percent} label="Платящих" value={`${s.payingClients} (${s.payingPercent}%)`} sub="от всех" color="text-rose-500" />
          <MetricCard index={12} icon={DollarSign} label="ARPU" value={fmtDec(s.arpu)} sub="доход / клиент" color="text-indigo-500" />
          <MetricCard index={13} icon={Award} label="По рефералу" value={fmt(s.withReferrer)} sub={`${s.totalClients > 0 ? Math.round((s.withReferrer / s.totalClients) * 100) : 0}% от всех`} color="text-pink-500" />
        </div>
      </section>

      {/* ═══ ТРИАЛЫ ═══ */}
      <section>
        <SectionHeader icon={Zap} title="Триалы" subtitle="Пробный период и конверсия" />
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard index={14} icon={Zap} label="Всего триалов" value={fmt(s.trialUsedCount)} sub="активаций" color="text-yellow-500" />
          <MetricCard
            index={15}
            icon={s.trialConversionRate > 20 ? ArrowUpRight : ArrowDownRight}
            label="Конверсия триал → покупка"
            value={`${s.trialConversionRate}%`}
            sub={`${s.trialToPaid} из ${s.trialUsedCount}`}
            color={s.trialConversionRate > 20 ? "text-green-500" : "text-orange-500"}
          />
        </div>
      </section>

      {/* ═══ ГРАФИКИ ═══ */}
      <div className="grid gap-6 lg:grid-cols-2">

        {/* Доход по неделям */}
        <ChartCard index={16} title="Доход по неделям (90 дн.)" icon={TrendingUp}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={revenueWeekly}>
              <defs>
                

                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="stroke-slate-200 dark:stroke-white/10" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} className="text-slate-500" />
              <YAxis tick={{ fontSize: 11 }} className="text-slate-500" />
              <Tooltip
                content={<CustomTooltip />}
                formatter={(v) => [fmt(Number(v ?? 0)), "Доход"]}
              />
              <Area type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2} fillOpacity={1} fill="url(#revGrad)"  />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Новые пользователи */}
        <ChartCard index={17} title="Новые пользователи по неделям (90 дн.)" icon={UserPlus}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={clientsWeekly}>
              
              <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="stroke-slate-200 dark:stroke-white/10" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} className="text-slate-500" />
              <YAxis tick={{ fontSize: 11 }} className="text-slate-500" allowDecimals={false} />
              <Tooltip
                content={<CustomTooltip />}
                formatter={(v) => [Number(v ?? 0), "Пользователей"]}
              />
              <Bar dataKey="value" fill="#10b981" radius={[4, 4, 0, 0]}  />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Триалы по неделям */}
        <ChartCard index={18} title="Триалы по неделям (90 дн.)" icon={Zap}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={trialsWeekly}>
              
              <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="stroke-slate-200 dark:stroke-white/10" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} className="text-slate-500" />
              <YAxis tick={{ fontSize: 11 }} className="text-slate-500" allowDecimals={false} />
              <Tooltip
                content={<CustomTooltip />}
                formatter={(v) => [Number(v ?? 0), "Триалов"]}
              />
              <Bar dataKey="value" fill="#f59e0b" radius={[4, 4, 0, 0]}  />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Реферальные выплаты по неделям */}
        <ChartCard index={19} title="Реферальные выплаты по неделям (90 дн.)" icon={Award}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={refCreditsWeekly}>
              <defs>
                
                

                <linearGradient id="refGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ec4899" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#ec4899" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="stroke-slate-200 dark:stroke-white/10" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} className="text-slate-500" />
              <YAxis tick={{ fontSize: 11 }} className="text-slate-500" />
              <Tooltip
                content={<CustomTooltip />}
                formatter={(v) => [fmtDec(Number(v ?? 0)), "Выплаты"]}
              />
              <Area type="monotone" dataKey="value" stroke="#ec4899" strokeWidth={2} fillOpacity={1} fill="url(#refGrad)"  />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Промо активации (ссылки + коды) */}
        <ChartCard index={20} title="Промо активации по неделям (90 дн.)" icon={Gift}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={promoWeekly}>
              
              <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="stroke-slate-200 dark:stroke-white/10" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} className="text-slate-500" />
              <YAxis tick={{ fontSize: 11 }} className="text-slate-500" allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="v1" name="Промо-ссылки" fill="#8b5cf6" radius={[4, 4, 0, 0]}  />
              <Line type="monotone" dataKey="v2" name="Промокоды" stroke="#06b6d4" strokeWidth={2} dot={false}  />
              <Legend wrapperStyle={{ fontSize: "11px", color: "rgba(148,163,184,0.9)" }} />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Источники клиентов — пирог */}
        <ChartCard index={21} title="Источники клиентов" icon={Users}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              
              <Pie
                data={[
                  { name: "Только бот", value: s.botClients },
                  { name: "Только сайт", value: s.siteClients },
                  { name: "Бот + сайт", value: s.bothClients },
                ].filter((d) => d.value > 0)}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={90}
                stroke="hsl(var(--background))"
                strokeWidth={2}
                
                label={({ name, percent }: { name?: string; percent?: number }) => `${name ?? ""} ${((percent ?? 0) * 100).toFixed(0)}%`}
              >
                {[COLORS[0], COLORS[2], COLORS[1]].map((c, i) => (
                  <Cell key={i} fill={c} />
                ))}
              </Pie>
              <Tooltip
                content={<CustomTooltip />}
                formatter={(v) => [Number(v ?? 0), "Клиентов"]}
              />
              <Legend wrapperStyle={{ fontSize: "11px", color: "rgba(148,163,184,0.9)" }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Доход по провайдерам */}
        <ChartCard index={22} title="Доход по способам оплаты (90 дн.)" icon={Tag}>
          {data.providerSeries.length === 0 ? (
            <NoData />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>

              
                <Pie
                  data={data.providerSeries}
                  dataKey="amount"
                  nameKey="provider"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                stroke="hsl(var(--background))"
                strokeWidth={2}
                
                  label={({ name, percent }: { name?: string; percent?: number }) => `${name ?? ""} ${((percent ?? 0) * 100).toFixed(0)}%`}
                >
                  {data.providerSeries.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  content={<CustomTooltip />}
                  formatter={(v) => [fmt(Number(v ?? 0)), "Сумма"]}
                />
                <Legend wrapperStyle={{ fontSize: "11px", color: "rgba(148,163,184,0.9)" }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* Топ тарифов */}
        <ChartCard index={23} title="Топ тарифов по доходу (90 дн.)" icon={ShoppingCart}>
          {data.topTariffs.length === 0 ? (
            <NoData />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.topTariffs} layout="vertical" margin={{ top: 0, right: 0, left: 10, bottom: 0 }}>
              
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="stroke-slate-200 dark:stroke-white/10" />
                <XAxis type="number" tick={{ fontSize: 11 }} className="text-slate-500" />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={110} className="text-slate-500" />
                <Tooltip
                  content={<CustomTooltip />}
                  formatter={(v: any) => [fmt(Number(v ?? 0)), "Доход"]}
                />
                <Bar dataKey="revenue" fill="hsl(var(--primary))" name="Доход" radius={[0, 4, 4, 0]}  />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      {/* ═══ ИСТОЧНИКИ ТРАФИКА (UTM / КАМПАНИИ) ═══ */}
      <section>
        <SectionHeader icon={Target} title="Источники трафика (UTM)" subtitle="Статистика по рекламным кампаниям" />
        {!data.campaignsStats?.length ? (
          <GlassCard animIndex={24}>
            <CardContent className="py-8 text-center text-sm font-mono !text-white/60 uppercase tracking-widest"><span className="!text-white/30">[</span> НЕТ_ДАННЫХ_ПО_ИСТОЧНИКАМ <span className="!text-white/30">]</span></CardContent>
          </GlassCard>
        ) : (
          <GlassCard animIndex={24}>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm font-mono !text-white">
                  <thead>
                    <tr className="border-b !border-white/10 !bg-white/5 text-xs tracking-widest uppercase !text-white/70">
                      <th className="text-left px-4 py-3 font-medium">Источник</th>
                      <th className="text-left px-4 py-3 font-medium">Кампания</th>
                      <th className="text-right px-4 py-3 font-medium">Регистрации</th>
                      <th className="text-right px-4 py-3 font-medium">Триалы</th>
                      <th className="text-right px-4 py-3 font-medium">Платежи</th>
                      <th className="text-right px-4 py-3 font-medium">Доход</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.campaignsStats.map((row, i) => (
                      <tr key={i} className="border-b !border-white/5 hover:!bg-white/10 transition-colors">
                        <td className="px-4 py-3 font-medium !text-white">{row.source}</td>
                        <td className="px-4 py-3 opacity-70">{row.campaign ?? "—"}</td>
                        <td className="px-4 py-3 text-right">{fmt(row.registrations)}</td>
                        <td className="px-4 py-3 text-right">{fmt(row.trials)}</td>
                        <td className="px-4 py-3 text-right">{fmt(row.payments)}</td>
                        <td className="px-4 py-3 text-right font-medium text-emerald-600 dark:text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.3)]">{fmtDec(row.revenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </GlassCard>
        )}
      </section>

      {/* ═══ ТОП РЕФЕРАЛОВ ═══ */}
      <section>
        <SectionHeader icon={Award} title="Топ рефералов" subtitle="Самые активные партнеры" />
        {data.topReferrers.length === 0 ? (
          <GlassCard animIndex={25}>
            <CardContent className="py-8 text-center text-sm font-mono !text-white/60 uppercase tracking-widest"><span className="!text-white/30">[</span> НЕТ_ДАННЫХ_ПО_РЕФЕРАЛАМ <span className="!text-white/30">]</span></CardContent>
          </GlassCard>
        ) : (
          <GlassCard animIndex={25}>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm font-mono !text-white">
                  <thead>
                    <tr className="border-b !border-white/10 !bg-white/5 text-xs tracking-widest uppercase !text-white/70">
                      <th className="text-left px-4 py-3 font-medium">#</th>
                      <th className="text-left px-4 py-3 font-medium">Реферер</th>
                      <th className="text-right px-4 py-3 font-medium">Рефералов</th>
                      <th className="text-right px-4 py-3 font-medium">Заработок</th>
                      <th className="text-right px-4 py-3 font-medium opacity-70">L1</th>
                      <th className="text-right px-4 py-3 font-medium opacity-70">L2</th>
                      <th className="text-right px-4 py-3 font-medium opacity-70">L3</th>
                      <th className="text-right px-4 py-3 font-medium">Начислений</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.topReferrers.map((r, i) => (
                      <tr key={r.id} className="border-b !border-white/5 hover:!bg-white/10 transition-colors">
                        <td className="px-4 py-3 opacity-50">{i + 1}</td>
                        <td className="px-4 py-3 font-medium !text-white">{r.name}</td>
                        <td className="px-4 py-3 text-right">{r.referrals}</td>
                        <td className="px-4 py-3 text-right font-medium text-emerald-600 dark:text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.3)]">{fmtDec(r.earnings)}</td>
                        <td className="px-4 py-3 text-right opacity-70">{fmtDec(r.l1)}</td>
                        <td className="px-4 py-3 text-right opacity-70">{fmtDec(r.l2)}</td>
                        <td className="px-4 py-3 text-right opacity-70">{fmtDec(r.l3)}</td>
                        <td className="px-4 py-3 text-right">{r.credits}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </GlassCard>
        )}
      </section>

      {/* ═══ ПРОМО СТАТИСТИКА ═══ */}
      <section>
        <SectionHeader icon={Gift} title="Промо-статистика" subtitle="Активации кодов и ссылок" />
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-3 mb-6">
          <MetricCard index={26} icon={Gift} label="Промо-ссылки активаций" value={fmt(s.promoActivations)} color="text-violet-500" />
          <MetricCard index={27} icon={Tag} label="Промокоды использований" value={fmt(s.promoCodeUsages)} color="text-cyan-500" />
          <MetricCard index={28} icon={Percent} label="Реферальные выплаты" value={fmtDec(s.totalReferralPaid)} color="text-pink-500" />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Промо-ссылки */}
          <GlassCard animIndex={29}>
            <CardHeader className="pb-2 relative pt-4 px-5">
              <CardTitle className="text-sm font-mono tracking-widest uppercase !text-white font-bold">
                <span className="!text-white/30">[</span> Промо-ссылки (топ 10) <span className="!text-white/30">]</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {data.promoGroupStats.length === 0 ? (
                <p className="text-sm !text-white/60 text-center py-8 font-mono tracking-widest uppercase opacity-50"><span className="!text-white/30">[</span> НЕТ_ДАННЫХ <span className="!text-white/30">]</span></p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm font-mono !text-white">
                    <thead>
                      <tr className="border-b !border-white/10 !bg-white/5 text-xs tracking-widest uppercase !text-white/70">
                        <th className="text-left px-4 py-3 font-medium">Название</th>
                        <th className="text-left px-4 py-3 font-medium">Код</th>
                        <th className="text-right px-4 py-3 font-medium">Активаций</th>
                        <th className="text-right px-4 py-3 font-medium">Лимит</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.promoGroupStats.map((g) => (
                        <tr key={g.code} className="border-b !border-white/5 hover:!bg-white/10 transition-colors">
                          <td className="px-4 py-3 !text-white font-medium">{g.name}</td>
                          <td className="px-4 py-3 text-xs text-primary/80">{g.code}</td>
                          <td className="px-4 py-3 text-right font-medium">{g.activations}</td>
                          <td className="px-4 py-3 text-right opacity-50">{g.maxActivations || "∞"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </GlassCard>

          {/* Промокоды */}
          <GlassCard animIndex={30}>
            <CardHeader className="pb-2 relative pt-4 px-5">
              <CardTitle className="text-sm font-mono tracking-widest uppercase !text-white font-bold">
                <span className="!text-white/30">[</span> Промокоды (топ 10) <span className="!text-white/30">]</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {data.promoCodeStats.length === 0 ? (
                <p className="text-sm !text-white/60 text-center py-8 font-mono tracking-widest uppercase opacity-50"><span className="!text-white/30">[</span> НЕТ_ДАННЫХ <span className="!text-white/30">]</span></p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm font-mono !text-white">
                    <thead>
                      <tr className="border-b !border-white/10 !bg-white/5 text-xs tracking-widest uppercase !text-white/70">
                        <th className="text-left px-4 py-3 font-medium">Код</th>
                        <th className="text-left px-4 py-3 font-medium">Тип</th>
                        <th className="text-right px-4 py-3 font-medium">Использований</th>
                        <th className="text-right px-4 py-3 font-medium">Лимит</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.promoCodeStats.map((c) => (
                        <tr key={c.code} className="border-b !border-white/5 hover:!bg-white/10 transition-colors">
                          <td className="px-4 py-3 text-xs text-primary/80">{c.code}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center border px-2 py-0.5 text-[10px] tracking-widest uppercase font-bold ${
                              c.type === "DISCOUNT" 
                                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.1)]" 
                                : "border-cyan-500/30 bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.1)]"
                            }`}>
                              {c.type === "DISCOUNT" ? "СКИДКА" : "ДНИ"}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right font-medium">{c.usages}</td>
                          <td className="px-4 py-3 text-right opacity-50">{c.maxUses || "∞"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </GlassCard>
        </div>
      </section>
    </motion.div>
  );
}

// ─── Компоненты ───

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="!bg-black/40 !backdrop-blur-md !text-white border !border-white/20 px-3 py-2 rounded-lg shadow-xl text-xs font-mono z-50">
        {label && <p className="font-bold mb-1.5 opacity-80 border-b !border-white/20 pb-1">{label}</p>}
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center justify-between gap-4 py-0.5">
            <div className="flex items-center gap-1.5">
              <div 
                className="w-2 h-2 rounded-full shadow-[0_0_5px_currentColor]" 
                style={{ 
                  backgroundColor: entry.color || entry.payload?.fill || 'hsl(var(--primary))',
                  color: entry.color || entry.payload?.fill || 'hsl(var(--primary))'
                }} 
              />
              <span className="opacity-80">{entry.name}</span>
            </div>
            <span className="font-bold">{entry.value}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};


function MetricCard({
  index = 0,
  icon: Icon,
  label,
  value,
  sub,
  color: _color,
}: {
  index?: number;
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
}) {
  const theme = {
    borderHover: "hover:!border-white/40",
    shadowHover: "hover:shadow-md",
    bracket: "!text-white/30",
    title: "!text-white",
    iconBg: "!bg-white/10",
    iconBorder: "!border-white/20",
    iconText: "!text-white",
    subtitle: "!text-white/60",
    valueGlow: "",
  };

  const renderValue = () => {
    if (typeof value === "string" && value.includes(" / ")) {
      const parts = value.split(" / ");
      return (
        <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
          {parts.map((part, i) => (
            <Fragment key={i}>
              <div className={`px-2 py-0.5 rounded !bg-white/10 !border-white/20 text-lg sm:text-xl font-black tracking-tight !text-white border ${theme.valueGlow}`}>
                {part}
              </div>
              {i < parts.length - 1 && (
                <span className="!text-white/50 font-bold text-sm">/</span>
              )}
            </Fragment>
          ))}
        </div>
      );
    }
    return (
      <div className={`text-2xl sm:text-3xl font-black tracking-tight !text-white mb-1.5 ${theme.valueGlow}`}>
        {value}
      </div>
    );
  };

   return (
     <motion.div custom={index} variants={cardVariants} initial="hidden" animate="visible" className="h-full">
       <Card className={`group relative h-full overflow-hidden !bg-white/10 dark:!bg-white/10 !bg-gradient-to-br !from-white/10 !to-white/5 !backdrop-blur-md !border-white/20 dark:!border-white/20 !text-white shadow-sm hover:-translate-y-1 transition-all duration-500 font-mono flex flex-col border ${theme.borderHover} ${theme.shadowHover}`}>
         
         <div className="p-4 sm:p-5 flex flex-col h-full justify-between relative z-10 min-h-[120px]">
          <div className="flex justify-between items-start w-full mb-4">
            <div className="flex items-center gap-1.5 overflow-hidden pr-2 mt-1">
              <span className={`${theme.bracket} text-[10px] sm:text-xs font-bold`}>[</span>
              <h3 className={`text-[10px] sm:text-xs font-bold tracking-[0.1em] uppercase ${theme.title} truncate`}>{label}</h3>
              <span className={`${theme.bracket} text-[10px] sm:text-xs font-bold`}>]</span>
            </div>
            <motion.div
              className={`relative flex items-center justify-center w-8 h-8 rounded-md border ${theme.iconBg} ${theme.iconBorder}`}
              whileHover={{ scale: 1.1, rotate: 5 }}
              transition={{ type: "spring", stiffness: 400, damping: 10 }}
            >
              <Icon className={`w-4 h-4 ${theme.iconText}`} />
            </motion.div>
          </div>
          
          <div className="mt-auto">
            {renderValue()}
            <div className={`text-[9px] sm:text-[10px] tracking-widest uppercase font-semibold ${theme.subtitle} flex items-center gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity`}>
              <span className={`${theme.bracket} opacity-70`}>&gt;</span>
              <span className="truncate">{sub || "DATA_POINT"}</span>
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}

function ChartCard({ title, icon: Icon, children, index = 0 }: { title: string; icon: React.ElementType; children: React.ReactNode; index?: number }) {
  return (
    <GlassCard animIndex={index} className="flex flex-col">
      <CardHeader className="pb-2 relative pt-4 px-5">
        <CardTitle className="flex items-center gap-2 text-sm font-mono tracking-widest uppercase !text-white font-bold">
          <span className="!text-white/30">[</span>
          <Icon className="h-4 w-4 !text-white" />
          {title}
          <span className="!text-white/30">]</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-2 pb-5 px-5 relative flex-1">
        <div className="h-72 w-full">{children}</div>
      </CardContent>
    </GlassCard>
  );
}

function NoData() {
  return <p className="text-sm !text-white/60 py-8 text-center h-72 flex items-center justify-center tracking-widest uppercase font-mono"><span className="!text-white/30">[</span> НЕТ_ДАННЫХ <span className="!text-white/30">]</span></p>;
}

// ─── Утилиты ───

function aggregateByWeek(series: { date: string; value: number }[]): { label: string; value: number }[] {
  const weeks: { label: string; value: number }[] = [];
  let weekSum = 0;
  let weekStart = "";
  for (let i = 0; i < series.length; i++) {
    if (i % 7 === 0) {
      if (i > 0) weeks.push({ label: weekStart, value: weekSum });
      weekStart = series[i].date.slice(5);
      weekSum = 0;
    }
    weekSum += series[i].value;
  }
  if (weekStart) weeks.push({ label: weekStart, value: weekSum });
  return weeks;
}

function aggregateByWeekTwo(
  s1: { date: string; value: number }[],
  s2: { date: string; value: number }[],
  _name1: string,
  _name2: string,
): { label: string; v1: number; v2: number }[] {
  const weeks: { label: string; v1: number; v2: number }[] = [];
  let w1 = 0, w2 = 0, weekStart = "";
  const len = Math.max(s1.length, s2.length);
  for (let i = 0; i < len; i++) {
    if (i % 7 === 0) {
      if (i > 0) weeks.push({ label: weekStart, v1: w1, v2: w2 });
      weekStart = (s1[i]?.date ?? s2[i]?.date ?? "").slice(5);
      w1 = 0; w2 = 0;
    }
    w1 += s1[i]?.value ?? 0;
    w2 += s2[i]?.value ?? 0;
  }
  if (weekStart) weeks.push({ label: weekStart, v1: w1, v2: w2 });
  return weeks;
}
