import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Package, Calendar, Wifi, Smartphone, CreditCard, Loader2, Gift, Tag, Check, Wallet, ChevronDown, Shield, Zap, ArrowLeft } from "lucide-react";
import { useClientAuth } from "@/contexts/client-auth";
import { api } from "@/lib/api";
import type { PublicTariffCategory } from "@/lib/api";
import { formatRuDays } from "@/lib/i18n";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import { useCabinetMiniapp } from "@/pages/cabinet/cabinet-layout";
import { openPaymentInBrowser } from "@/lib/open-payment-url";
import { cn } from "@/lib/utils";

function formatMoney(amount: number, currency: string) {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: currency.toUpperCase() === "USD" ? "USD" : currency.toUpperCase() === "RUB" ? "RUB" : "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

type TariffForPay = { id: string; name: string; price: number; currency: string; description?: string | null; durationDays?: number; trafficLimitBytes?: number | null; trafficResetMode?: string; deviceLimit?: number | null };

export function ClientTariffsPage() {
  const { state, refreshProfile } = useClientAuth();
  const token = state.token;
  const client = state.client;
  const [tariffs, setTariffs] = useState<PublicTariffCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [plategaMethods, setPlategaMethods] = useState<{ id: number; label: string }[]>([]);
  const [yoomoneyEnabled, setYoomoneyEnabled] = useState(false);
  const [yookassaEnabled, setYookassaEnabled] = useState(false);
  const [cryptopayEnabled, setCryptopayEnabled] = useState(false);
  const [heleketEnabled, setHeleketEnabled] = useState(false);
  const [trialConfig, setTrialConfig] = useState<{ trialEnabled: boolean; trialDays: number }>({ trialEnabled: false, trialDays: 0 });
  const [payModal, setPayModal] = useState<{ tariff: TariffForPay } | null>(null);
  const [payLoading, setPayLoading] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const [trialLoading, setTrialLoading] = useState(false);
  const [trialError, setTrialError] = useState<string | null>(null);

  // Промокод
  const [promoInput, setPromoInput] = useState("");
  const [promoChecking, setPromoChecking] = useState(false);
  const [promoResult, setPromoResult] = useState<{ type: string; discountPercent?: number | null; discountFixed?: number | null; name: string } | null>(null);
  const [promoError, setPromoError] = useState<string | null>(null);

  const showTrial = trialConfig.trialEnabled && !client?.trialUsed;

  const isMobileOrMiniapp = useCabinetMiniapp();
  const useCategoryCardLayout = isMobileOrMiniapp;
  const [expandedCategoryId, setExpandedCategoryId] = useState<string | null>(null);

  useEffect(() => {
    if (useCategoryCardLayout && tariffs.length > 0) {
      setExpandedCategoryId((prev) => (prev === null ? tariffs[0].id : prev));
    }
  }, [useCategoryCardLayout, tariffs]);

  useEffect(() => {
    api.getPublicTariffs().then((r) => {
      setTariffs(r.items ?? []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    api.getPublicConfig().then((c) => {
      setPlategaMethods(c.plategaMethods ?? []);
      setYoomoneyEnabled(Boolean(c.yoomoneyEnabled));
      setYookassaEnabled(Boolean(c.yookassaEnabled));
      setCryptopayEnabled(Boolean(c.cryptopayEnabled));
      setHeleketEnabled(Boolean(c.heleketEnabled));
      setTrialConfig({ trialEnabled: !!c.trialEnabled, trialDays: c.trialDays ?? 0 });
    }).catch(() => { });
  }, []);

  async function activateTrial() {
    if (!token) return;
    setTrialError(null);
    setTrialLoading(true);
    try {
      await api.clientActivateTrial(token);
      await refreshProfile();
    } catch (e) {
      setTrialError(e instanceof Error ? e.message : "Ошибка активации тестового доступа");
    } finally {
      setTrialLoading(false);
    }
  }

  async function checkPromo() {
    if (!token || !promoInput.trim()) return;
    setPromoChecking(true);
    setPromoError(null);
    setPromoResult(null);
    try {
      const res = await api.clientCheckPromoCode(token, promoInput.trim());
      if (res.type === "DISCOUNT") {
        setPromoResult(res);
      } else {
        const activateRes = await api.clientActivatePromoCode(token, promoInput.trim());
        setPromoError(null);
        setPromoResult(null);
        setPromoInput("");
        setPayModal(null);
        alert(activateRes.message);
        await refreshProfile();
        return;
      }
    } catch (e) {
      setPromoError(e instanceof Error ? e.message : "Ошибка");
      setPromoResult(null);
    } finally {
      setPromoChecking(false);
    }
  }

  function getDiscountedPrice(price: number): number {
    if (!promoResult) return price;
    let final = price;
    if (promoResult.discountPercent && promoResult.discountPercent > 0) {
      final -= final * promoResult.discountPercent / 100;
    }
    if (promoResult.discountFixed && promoResult.discountFixed > 0) {
      final -= promoResult.discountFixed;
    }
    return Math.max(0, Math.round(final * 100) / 100);
  }

  async function startPayment(tariff: TariffForPay, methodId: number) {
    if (!token) return;
    setPayError(null);
    setPayLoading(true);
    try {
      const res = await api.clientCreatePlategaPayment(token, {
        amount: tariff.price,
        currency: tariff.currency,
        paymentMethod: methodId,
        description: tariff.name,
        tariffId: tariff.id,
        promoCode: promoResult ? promoInput.trim() : undefined,
      });
      setPayModal(null);
      setPromoInput("");
      setPromoResult(null);
      openPaymentInBrowser(res.paymentUrl);
    } catch (e) {
      setPayError(e instanceof Error ? e.message : "Ошибка создания платежа");
    } finally {
      setPayLoading(false);
    }
  }

  async function payByBalance(tariff: TariffForPay) {
    if (!token) return;
    setPayError(null);
    setPayLoading(true);
    try {
      const res = await api.clientPayByBalance(token, {
        tariffId: tariff.id,
        promoCode: promoResult ? promoInput.trim() : undefined,
      });
      setPayModal(null);
      setPromoInput("");
      setPromoResult(null);
      alert(res.message);
      await refreshProfile();
    } catch (e) {
      setPayError(e instanceof Error ? e.message : "Ошибка оплаты");
    } finally {
      setPayLoading(false);
    }
  }

  async function startYoomoneyPayment(tariff: TariffForPay) {
    if (!token) return;
    if (tariff.currency.toUpperCase() !== "RUB") {
      setPayError("ЮMoney принимает только рубли. Выберите тариф в RUB или оплатите картой Platega.");
      return;
    }
    setPayError(null);
    setPayLoading(true);
    try {
      const res = await api.yoomoneyCreateFormPayment(token, {
        amount: tariff.price,
        paymentType: "AC",
        tariffId: tariff.id,
        promoCode: promoResult ? promoInput.trim() : undefined,
      });
      setPayModal(null);
      setPromoInput("");
      setPromoResult(null);
      if (res.paymentUrl) openPaymentInBrowser(res.paymentUrl);
    } catch (e) {
      setPayError(e instanceof Error ? e.message : "Ошибка создания платежа");
    } finally {
      setPayLoading(false);
    }
  }

  async function startYookassaPayment(tariff: TariffForPay) {
    if (!token) return;
    if (tariff.currency.toUpperCase() !== "RUB") {
      setPayError("ЮKassa принимает только рубли (RUB).");
      return;
    }
    setPayError(null);
    setPayLoading(true);
    try {
      const res = await api.yookassaCreatePayment(token, {
        amount: tariff.price,
        currency: "RUB",
        tariffId: tariff.id,
        promoCode: promoResult ? promoInput.trim() : undefined,
      });
      setPayModal(null);
      setPromoInput("");
      setPromoResult(null);
      if (res.confirmationUrl) openPaymentInBrowser(res.confirmationUrl);
    } catch (e) {
      setPayError(e instanceof Error ? e.message : "Ошибка создания платежа");
    } finally {
      setPayLoading(false);
    }
  }

  async function startCryptopayPayment(tariff: TariffForPay) {
    if (!token) return;
    setPayError(null);
    setPayLoading(true);
    try {
      const res = await api.cryptopayCreatePayment(token, {
        amount: tariff.price,
        currency: tariff.currency,
        tariffId: tariff.id,
        promoCode: promoResult ? promoInput.trim() : undefined,
      });
      setPayModal(null);
      setPromoInput("");
      setPromoResult(null);
      if (res.payUrl) openPaymentInBrowser(res.payUrl);
    } catch (e) {
      setPayError(e instanceof Error ? e.message : "Ошибка создания платежа");
    } finally {
      setPayLoading(false);
    }
  }

  async function startHeleketPayment(tariff: TariffForPay) {
    if (!token) return;
    setPayError(null);
    setPayLoading(true);
    try {
      const res = await api.heleketCreatePayment(token, {
        amount: tariff.price,
        currency: tariff.currency,
        tariffId: tariff.id,
        promoCode: promoResult ? promoInput.trim() : undefined,
      });
      setPayModal(null);
      setPromoInput("");
      setPromoResult(null);
      if (res.payUrl) openPaymentInBrowser(res.payUrl);
    } catch (e) {
      setPayError(e instanceof Error ? e.message : "Ошибка создания платежа");
    } finally {
      setPayLoading(false);
    }
  }

  const closePayment = () => {
    setPayModal(null);
    setPromoInput("");
    setPromoResult(null);
    setPromoError(null);
    setPayError(null);
  };

  // === КОНТЕНТ ОПЛАТЫ (ОБЩИЙ ДЛЯ MOBILE VIEW И DESKTOP DIALOG) ===
  const PaymentContent = () => {
    if (!payModal) return null;
    const tariff = payModal.tariff;
    const price = promoResult ? getDiscountedPrice(tariff.price) : tariff.price;
    const hasBalance = client ? client.balance >= price : false;

    return (
      <div className="space-y-6">
        {/* Карточка с инфой о тарифе */}
        <div className={cn("rounded-2xl relative overflow-hidden", isMobileOrMiniapp ? "bg-card/40 border border-white/5 p-5" : "bg-background/50 border border-border/50 p-4")}>
          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="flex justify-between items-start gap-4 relative z-10">
            <div className="space-y-1.5">
              <p className={cn("font-medium", isMobileOrMiniapp ? "text-sm text-muted-foreground" : "text-muted-foreground")}>
                {isMobileOrMiniapp ? "Итого к оплате" : "Тариф:"}
              </p>
              {!isMobileOrMiniapp && <p className="font-bold text-foreground">{tariff.name}</p>}
              
              {isMobileOrMiniapp && (
                <div className="flex items-baseline gap-2">
                  {promoResult ? (
                    <>
                      <span className="text-3xl font-black text-primary">{formatMoney(price, tariff.currency)}</span>
                      <span className="text-lg line-through text-muted-foreground decoration-2">{formatMoney(tariff.price, tariff.currency)}</span>
                    </>
                  ) : (
                    <span className="text-3xl font-black text-primary">{formatMoney(tariff.price, tariff.currency)}</span>
                  )}
                </div>
              )}
            </div>
            
            {!isMobileOrMiniapp && (
              <div className="text-right">
                {promoResult ? (
                  <div className="flex flex-col items-end">
                    <span className="line-through text-muted-foreground/70 text-sm decoration-2">{formatMoney(tariff.price, tariff.currency)}</span>
                    <span className="font-bold text-xl text-primary">{formatMoney(price, tariff.currency)}</span>
                  </div>
                ) : (
                  <span className="font-bold text-xl text-primary">{formatMoney(tariff.price, tariff.currency)}</span>
                )}
              </div>
            )}
          </div>
          
          {isMobileOrMiniapp && (
            <div className="mt-4 pt-4 border-t border-white/5 grid grid-cols-2 gap-3 relative z-10">
              <div className="bg-background/40 rounded-2xl p-3 border border-white/5">
                <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider mb-1">Срок</p>
                <div className="flex items-center gap-1.5 font-bold text-sm">
                  <Calendar className="h-4 w-4 text-primary" />
                  {tariff.durationDays} дн.
                </div>
              </div>
              <div className="bg-background/40 rounded-2xl p-3 border border-white/5">
                <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider mb-1">Трафик</p>
                <div className="flex items-center gap-1.5 font-bold text-sm">
                  <Wifi className="h-4 w-4 text-primary" />
                  {tariff.trafficLimitBytes != null && tariff.trafficLimitBytes > 0 ? `${(tariff.trafficLimitBytes / 1024 / 1024 / 1024).toFixed(1)} ГБ${tariff.trafficResetMode === "monthly" ? "/мес" : ""}` : "∞"}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Промокод */}
        <div className={cn("space-y-3", !isMobileOrMiniapp && "bg-background/40 border border-border/50 rounded-2xl p-4 focus-within:border-primary/50 focus-within:bg-background/60 hover:border-primary/30 transition-all duration-300 relative overflow-hidden group")}>
          {!isMobileOrMiniapp && <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />}
          <div className="flex items-center gap-2 text-sm font-bold text-foreground pl-1 relative z-10">
            {isMobileOrMiniapp ? <Tag className="h-4 w-4 text-primary" /> : <div className="p-1.5 bg-primary/10 rounded-lg"><Tag className="h-4 w-4 text-primary" /></div>}
            Промокод
          </div>
          <div className="flex gap-2 relative z-10">
            <Input
              name="promo_code"
              autoComplete="off"
              inputMode="text"
              value={promoInput}
              onChange={(e) => { setPromoInput(e.target.value); if (promoResult) { setPromoResult(null); setPromoError(null); } }}
              placeholder="Введите промокод"
              className={cn("font-mono font-medium focus-visible:ring-primary/50", isMobileOrMiniapp ? "text-base bg-card/40 border-white/5 h-14 rounded-2xl" : "text-sm bg-background border-border/50 h-12 rounded-xl shadow-sm")}
              disabled={payLoading || promoChecking}
            />
            <Button
              variant={isMobileOrMiniapp ? "default" : "secondary"}
              onClick={checkPromo}
              disabled={!promoInput.trim() || payLoading || promoChecking}
              className={cn("shrink-0 font-bold bg-primary text-primary-foreground shadow-md transition-all hover:scale-105 active:scale-95", isMobileOrMiniapp ? "h-14 px-6 rounded-2xl text-base" : "h-12 px-5 rounded-xl text-sm border-0 hover:bg-primary/90")}
            >
              {promoChecking ? <Loader2 className="h-5 w-5 animate-spin" /> : "Применить"}
            </Button>
          </div>
          <AnimatePresence>
            {promoResult && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden relative z-10">
                <div className={cn("flex items-center gap-2 px-4 py-3 bg-green-500/10 border border-green-500/20", isMobileOrMiniapp ? "rounded-2xl" : "rounded-lg")}>
                  <Check className={cn("text-green-500", isMobileOrMiniapp ? "h-5 w-5" : "h-4 w-4")} />
                  <span className={cn("font-bold text-green-500", isMobileOrMiniapp ? "text-sm" : "text-sm")}>
                    {promoResult.name}: -{promoResult.discountPercent ? `${promoResult.discountPercent}%` : ""}{promoResult.discountFixed ? ` ${promoResult.discountFixed}` : ""}
                  </span>
                </div>
              </motion.div>
            )}
            {promoError && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden relative z-10">
                <div className={cn("flex items-center gap-2 px-4 py-3 bg-destructive/10 border border-destructive/20", isMobileOrMiniapp ? "rounded-2xl" : "rounded-lg")}>
                  <span className={cn("font-bold text-destructive", isMobileOrMiniapp ? "text-sm" : "text-sm")}>
                    {promoError}
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Способы оплаты */}
        <div className={cn("space-y-3")}>
          <div className="flex items-center gap-2 pt-2 pb-1">
            <Wallet className={cn("text-primary", isMobileOrMiniapp ? "h-5 w-5" : "h-4 w-4")} />
            <span className={cn("font-bold", isMobileOrMiniapp ? "text-lg" : "text-sm")}>Способ оплаты</span>
          </div>

          {payError && (
            <div className={cn("p-4 bg-destructive/10 border border-destructive/20 text-destructive text-center font-bold", isMobileOrMiniapp ? "rounded-2xl text-sm" : "rounded-xl text-sm mb-4")}>
              {payError}
            </div>
          )}

          <div className="space-y-3">
            {client && (
              <Button
                size="lg"
                onClick={() => payByBalance(tariff)}
                disabled={payLoading || !hasBalance}
                className={cn("w-full shadow-lg border-0 group relative overflow-hidden", isMobileOrMiniapp ? "justify-between px-6 h-16 rounded-2xl bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400" : "gap-2 h-14 rounded-xl bg-gradient-to-r from-primary to-primary/80 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300")}
              >
                {!isMobileOrMiniapp && <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />}
                
                {isMobileOrMiniapp ? (
                  <>
                    <div className="flex items-center gap-3">
                      {payLoading ? <Loader2 className="h-6 w-6 text-white animate-spin" /> : <Wallet className="h-6 w-6 text-white" />}
                      <span className="text-base font-bold text-white">Оплатить с баланса</span>
                    </div>
                    <span className="text-white/80 font-mono font-medium bg-black/20 px-2 py-1 rounded-lg">
                      {formatMoney(client.balance, tariff.currency)}
                    </span>
                  </>
                ) : (
                  <>
                    {payLoading ? <Loader2 className="h-5 w-5 animate-spin relative z-10" /> : <Wallet className="h-5 w-5 relative z-10" />}
                    <span className="text-base font-semibold relative z-10">Оплатить с баланса</span>
                    <span className="opacity-90 font-medium ml-1 bg-black/10 px-2 py-0.5 rounded-md relative z-10">
                      ({formatMoney(client.balance, payModal.tariff.currency)})
                    </span>
                  </>
                )}
              </Button>
            )}

            {cryptopayEnabled && (
              <Button
                size="lg"
                variant="outline"
                onClick={() => startCryptopayPayment(tariff)}
                disabled={payLoading}
                className={cn("w-full", isMobileOrMiniapp ? "justify-start gap-4 px-6 h-16 rounded-2xl border-white/5 bg-card/40 hover:bg-card/60" : "gap-3 hover:bg-background/80 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 rounded-xl h-14 border-border/50 group justify-center px-6 relative")}
              >
                {isMobileOrMiniapp ? (
                  <>
                    <div className="p-2 rounded-xl bg-yellow-500/10">
                      {payLoading ? <Loader2 className="h-6 w-6 animate-spin text-yellow-500" /> : <Zap className="h-6 w-6 text-yellow-500" />}
                    </div>
                    <span className="text-base font-bold">Crypto Bot</span>
                  </>
                ) : (
                  <>
                    <div className="absolute left-6 p-1.5 rounded-lg bg-yellow-500/10 group-hover:bg-yellow-500/20 transition-colors">
                      {payLoading ? <Loader2 className="h-5 w-5 animate-spin text-yellow-500" /> : <Zap className="h-5 w-5 text-yellow-500" />}
                    </div>
                    <span className="text-base font-medium">⚡ Crypto Bot (Криптовалюта)</span>
                  </>
                )}
              </Button>
            )}

            {heleketEnabled && (
              <Button
                size="lg"
                variant="outline"
                onClick={() => startHeleketPayment(tariff)}
                disabled={payLoading}
                className={cn("w-full", isMobileOrMiniapp ? "justify-start gap-4 px-6 h-16 rounded-2xl border-white/5 bg-card/40 hover:bg-card/60" : "gap-3 hover:bg-background/80 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 rounded-xl h-14 border-border/50 group justify-center px-6 relative")}
              >
                {isMobileOrMiniapp ? (
                  <>
                    <div className="p-2 rounded-xl bg-orange-500/10">
                      {payLoading ? <Loader2 className="h-6 w-6 animate-spin text-orange-500" /> : <Zap className="h-6 w-6 text-orange-500" />}
                    </div>
                    <span className="text-base font-bold">Heleket</span>
                  </>
                ) : (
                  <>
                    <div className="absolute left-6 p-1.5 rounded-lg bg-orange-500/10 group-hover:bg-orange-500/20 transition-colors">
                      {payLoading ? <Loader2 className="h-5 w-5 animate-spin text-orange-500" /> : <Zap className="h-5 w-5 text-orange-500" />}
                    </div>
                    <span className="text-base font-medium">⚡ Heleket (Криптовалюта)</span>
                  </>
                )}
              </Button>
            )}

            {yookassaEnabled && tariff.currency.toUpperCase() === "RUB" && (
              <Button
                size="lg"
                variant="outline"
                onClick={() => startYookassaPayment(tariff)}
                disabled={payLoading}
                className={cn("w-full", isMobileOrMiniapp ? "justify-start gap-4 px-6 h-16 rounded-2xl border-white/5 bg-card/40 hover:bg-card/60" : "gap-3 hover:bg-background/80 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 rounded-xl h-14 border-border/50 group justify-center px-6 relative")}
              >
                 {isMobileOrMiniapp ? (
                  <>
                    <div className="p-2 rounded-xl bg-green-500/10">
                      {payLoading ? <Loader2 className="h-6 w-6 animate-spin text-green-500" /> : <CreditCard className="h-6 w-6 text-green-500" />}
                    </div>
                    <span className="text-base font-bold">СБП / Карты РФ</span>
                  </>
                ) : (
                  <>
                    <div className="absolute left-6 p-1.5 rounded-lg bg-green-500/10 group-hover:bg-green-500/20 transition-colors">
                      {payLoading ? <Loader2 className="h-5 w-5 animate-spin text-green-500" /> : <CreditCard className="h-5 w-5 text-green-500" />}
                    </div>
                    <span className="text-base font-medium">💳 СБП</span>
                  </>
                )}
              </Button>
            )}

            {yoomoneyEnabled && tariff.currency.toUpperCase() === "RUB" && (
              <Button
                size="lg"
                variant="outline"
                onClick={() => startYoomoneyPayment(tariff)}
                disabled={payLoading}
                className={cn("w-full", isMobileOrMiniapp ? "justify-start gap-4 px-6 h-16 rounded-2xl border-white/5 bg-card/40 hover:bg-card/60" : "gap-3 hover:bg-background/80 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 rounded-xl h-14 border-border/50 group justify-center px-6 relative")}
              >
                 {isMobileOrMiniapp ? (
                  <>
                    <div className="p-2 rounded-xl bg-green-500/10">
                      {payLoading ? <Loader2 className="h-6 w-6 animate-spin text-green-500" /> : <CreditCard className="h-6 w-6 text-green-500" />}
                    </div>
                    <span className="text-base font-bold">ЮMoney / Карты</span>
                  </>
                ) : (
                  <>
                    <div className="absolute left-6 p-1.5 rounded-lg bg-green-500/10 group-hover:bg-green-500/20 transition-colors">
                      {payLoading ? <Loader2 className="h-5 w-5 animate-spin text-green-500" /> : <CreditCard className="h-5 w-5 text-green-500" />}
                    </div>
                    <span className="text-base font-medium">💳 Карты</span>
                  </>
                )}
              </Button>
            )}

            {plategaMethods.map((m) => (
              <Button
                key={m.id}
                size="lg"
                variant="outline"
                onClick={() => startPayment(tariff, m.id)}
                disabled={payLoading}
                className={cn("w-full", isMobileOrMiniapp ? "justify-start gap-4 px-6 h-16 rounded-2xl border-white/5 bg-card/40 hover:bg-card/60" : "gap-3 hover:bg-background/80 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 rounded-xl h-14 border-border/50 group justify-center px-6 relative")}
              >
                {isMobileOrMiniapp ? (
                  <>
                    <div className="p-2 rounded-xl bg-green-500/10">
                      {payLoading ? <Loader2 className="h-6 w-6 animate-spin text-green-500" /> : <CreditCard className="h-6 w-6 text-green-500" />}
                    </div>
                    <span className="text-base font-bold">{m.label}</span>
                  </>
                ) : (
                  <>
                    <div className="absolute left-6 p-1.5 rounded-lg bg-green-500/10 group-hover:bg-green-500/20 transition-colors">
                      {payLoading ? <Loader2 className="h-5 w-5 animate-spin text-green-500" /> : <CreditCard className="h-5 w-5 text-green-500" />}
                    </div>
                    <span className="text-base font-medium">💳 {m.label}</span>
                  </>
                )}
              </Button>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <AnimatePresence mode="wait">
        {/* MOBILE VIEW */}
        {isMobileOrMiniapp && payModal ? (
          <motion.div
            key="payment-view"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col w-full rounded-[2.5rem] border border-white/10 dark:border-white/5 bg-slate-50/60 dark:bg-slate-950/60 backdrop-blur-[32px] shadow-2xl relative"
          >
            <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-border/50 bg-background/30 backdrop-blur-md z-10 transition-colors rounded-t-[2.5rem]">
              <div className="flex items-center gap-3 min-w-0">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="shrink-0 h-9 w-9 rounded-full bg-background/50 hover:bg-background/80 transition-transform hover:scale-105" 
                  onClick={closePayment}
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <div className="min-w-0 flex-1">
                  <h2 className="text-sm sm:text-base font-bold truncate text-foreground">Оплата тарифа</h2>
                  <p className="text-[11px] font-medium text-muted-foreground truncate">{payModal.tariff.name}</p>
                </div>
              </div>
            </div>

            <div className="p-4 sm:p-6 pb-8">
               <PaymentContent />
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="tariffs-list"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.2 }}
            className="space-y-8 max-w-6xl mx-auto"
          >
            <div className="flex flex-col gap-2">
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">Тарифы</h1>
              <p className="text-muted-foreground text-[15px] font-medium max-w-2xl">
                Выберите подходящий тариф и оплатите.
              </p>
            </div>

            {showTrial && (
              <Card className="rounded-3xl border border-green-500/30 bg-green-500/5 backdrop-blur-xl shadow-lg hover:shadow-xl transition-all duration-300">
                <CardContent className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-6">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-green-500/20 text-green-500 shadow-inner shrink-0">
                      <Gift className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="font-bold text-lg text-foreground">Бесплатный Тест</p>
                      <p className="text-sm text-muted-foreground font-medium">
                        {trialConfig.trialDays > 0
                          ? `${formatRuDays(trialConfig.trialDays)} бесплатного доступа`
                          : "Бесплатный доступ"}
                      </p>
                    </div>
                  </div>
                  <Button
                    className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white shadow-lg h-12 rounded-xl text-md hover:scale-[1.02] transition-transform duration-300 shrink-0 gap-2"
                    onClick={activateTrial}
                    disabled={trialLoading}
                  >
                    {trialLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Gift className="h-5 w-5" />}
                    Бесплатный Тест
                  </Button>
                </CardContent>
                {trialError && <p className="text-sm text-destructive px-6 pb-4 font-medium">{trialError}</p>}
              </Card>
            )}

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary/50" />
              </div>
            ) : tariffs.length === 0 ? (
              <Card className="rounded-3xl border border-border/50 bg-card/40 backdrop-blur-xl shadow-sm">
                <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-4">
                  <Package className="h-12 w-12 opacity-20" />
                  <p className="text-base font-medium text-center">Тарифы пока не опубликованы.<br />Обратитесь в поддержку.</p>
                </CardContent>
              </Card>
            ) : useCategoryCardLayout ? (
              <div className="space-y-1">
                {tariffs.map((cat, catIndex) => (
                  <Collapsible
                    key={cat.id}
                    open={expandedCategoryId === cat.id}
                    onOpenChange={(open) => setExpandedCategoryId(open ? cat.id : null)}
                  >
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.25, delay: catIndex * 0.03 }}
                      className="rounded-3xl border border-border/50 bg-card/40 backdrop-blur-xl shadow-lg overflow-hidden transition-all duration-300"
                    >
                      <CollapsibleTrigger asChild>
                        <button
                          type="button"
                          className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left hover:bg-muted/20 active:bg-muted/30 transition-colors"
                        >
                          <span className="flex items-center gap-3 font-bold text-[16px] text-foreground">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/20 text-primary shadow-inner shrink-0">
                              <Package className="h-4 w-4" />
                            </div>
                            {cat.name}
                          </span>
                          <ChevronDown
                            className={`h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-300 ${expandedCategoryId === cat.id ? "rotate-180" : ""}`}
                          />
                        </button>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="px-3 pb-4 pt-1 flex flex-col gap-3">
                          {cat.tariffs.map((t) => (
                            <Card key={t.id} className="rounded-2xl border border-border/50 bg-background/50 backdrop-blur-md shadow-sm hover:shadow-md transition-all duration-300">
                              <CardContent className="flex flex-row items-center gap-4 py-4 px-4 min-h-0 min-w-0">
                                <div className="flex-1 min-w-0 space-y-1.5">
                                  <p className="text-[15px] font-bold leading-tight truncate text-foreground">{t.name}</p>
                                  {t.description?.trim() ? (
                                    <p className="text-xs text-muted-foreground font-medium line-clamp-2">{t.description}</p>
                                  ) : null}
                                  <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                                    <span className="flex items-center gap-1.5 bg-background/50 px-2 py-1 rounded-md border border-border/50">
                                      <Calendar className="h-3 w-3 text-primary" />
                                      {t.durationDays} дн.
                                    </span>
                                    <span className="flex items-center gap-1.5 bg-background/50 px-2 py-1 rounded-md border border-border/50">
                                      <Wifi className="h-3 w-3 text-primary" />
                                      {t.trafficLimitBytes != null && t.trafficLimitBytes > 0 ? `${(t.trafficLimitBytes / 1024 / 1024 / 1024).toFixed(1)} ГБ${t.trafficResetMode === "monthly" ? "/мес" : ""}` : "∞"}
                                    </span>
                                    <span className="flex items-center gap-1.5 bg-background/50 px-2 py-1 rounded-md border border-border/50">
                                      <Smartphone className="h-3 w-3 text-primary" />
                                      {t.deviceLimit != null && t.deviceLimit > 0 ? `${t.deviceLimit}` : "∞"}
                                    </span>
                                  </div>
                                </div>
                                <div className="flex flex-col items-center justify-center gap-2.5 shrink-0 min-w-[90px]">
                                  <span className="text-lg font-bold tabular-nums whitespace-nowrap text-foreground" title={formatMoney(t.price, t.currency)}>
                                    {formatMoney(t.price, t.currency)}
                                  </span>
                                  {token ? (
                                    <Button
                                      size="sm"
                                      className="w-full h-9 rounded-xl shadow-md text-xs font-semibold gap-1.5 hover:scale-105 transition-transform"
                                      onClick={() => setPayModal({ tariff: { ...t } })}
                                    >
                                      <CreditCard className="h-3.5 w-3.5 shrink-0" />
                                      Оплатить
                                    </Button>
                                  ) : (
                                    <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground bg-muted/50 px-2 py-1 rounded-md">В боте</span>
                                  )}
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </CollapsibleContent>
                    </motion.div>
                  </Collapsible>
                ))}
              </div>
            ) : (
              <div className="space-y-8">
                {tariffs.map((cat, catIndex) => (
                  <motion.section
                    key={cat.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: catIndex * 0.05 }}
                  >
                    <h2 className="text-xl font-bold mb-4 flex items-center gap-3 text-foreground">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/20 text-primary shadow-inner shrink-0">
                        <Package className="h-5 w-5" />
                      </div>
                      {cat.name}
                    </h2>
                    <div className="grid gap-4 sm:gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                      {cat.tariffs.map((t) => (
                        <Card key={t.id} className="rounded-3xl border border-border/50 bg-card/40 backdrop-blur-xl shadow-lg hover:shadow-xl transition-all duration-300 flex flex-col group hover:-translate-y-1">
                          <CardContent className="flex-1 flex flex-col p-5 min-h-0 min-w-0">
                            <div className="mb-4">
                              <p className="text-lg font-bold leading-tight line-clamp-2 text-foreground group-hover:text-primary transition-colors">{t.name}</p>
                              {t.description?.trim() ? (
                                <p className="text-sm text-muted-foreground font-medium mt-1.5 line-clamp-2">{t.description}</p>
                              ) : null}
                            </div>

                            <div className="flex flex-col gap-2.5 mt-auto mb-5 text-sm font-semibold text-muted-foreground">
                              <div className="flex items-center gap-3 bg-background/50 px-3 py-2 rounded-xl border border-border/50">
                                <div className="bg-primary/20 p-1.5 rounded-lg text-primary">
                                  <Calendar className="h-4 w-4 shrink-0" />
                                </div>
                                <span>{t.durationDays} дней</span>
                              </div>
                              <div className="flex items-center gap-3 bg-background/50 px-3 py-2 rounded-xl border border-border/50">
                                <div className="bg-primary/20 p-1.5 rounded-lg text-primary">
                                  <Wifi className="h-4 w-4 shrink-0" />
                                </div>
                                <span>
                                  {t.trafficLimitBytes != null && t.trafficLimitBytes > 0
                                    ? `${(t.trafficLimitBytes / 1024 / 1024 / 1024).toFixed(1)} ГБ${t.trafficResetMode === "monthly" ? "/мес" : ""}`
                                    : "Безлимитный трафик"}
                                </span>
                              </div>
                              <div className="flex items-center gap-3 bg-background/50 px-3 py-2 rounded-xl border border-border/50">
                                <div className="bg-primary/20 p-1.5 rounded-lg text-primary">
                                  <Smartphone className="h-4 w-4 shrink-0" />
                                </div>
                                <span>{t.deviceLimit != null && t.deviceLimit > 0 ? `${t.deviceLimit}` : "∞"} устройств</span>
                              </div>
                            </div>

                            <div className="pt-4 border-t border-border/50 mt-auto flex flex-col gap-3 min-w-0">
                              <span className="text-2xl font-black tabular-nums truncate min-w-0 text-foreground text-center" title={formatMoney(t.price, t.currency)}>
                                {formatMoney(t.price, t.currency)}
                              </span>
                              {token ? (
                                <Button
                                  size="lg"
                                  className="w-full h-12 rounded-xl shadow-md text-[15px] font-bold gap-2 hover:scale-[1.02] transition-transform"
                                  onClick={() => setPayModal({ tariff: { ...t } })}
                                >
                                  <CreditCard className="h-5 w-5 shrink-0" />
                                  Оплатить
                                </Button>
                              ) : (
                                <div className="w-full h-12 rounded-xl bg-muted/50 border border-border/50 flex items-center justify-center">
                                  <span className="text-sm font-bold uppercase tracking-wider text-muted-foreground">В боте</span>
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </motion.section>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* DESKTOP VIEW: DIALOG БЕЗ СКРОЛЛИНГА */}
      {!isMobileOrMiniapp && (
        <Dialog open={!!payModal} onOpenChange={(open) => { if (!open && !payLoading) closePayment(); }}>
          <DialogContent className="w-full max-w-md mx-auto sm:rounded-3xl p-5 sm:p-6 border border-border/50 bg-card/60 backdrop-blur-3xl shadow-2xl" showCloseButton={!payLoading} onOpenAutoFocus={(e) => e.preventDefault()}>
            <DialogHeader className="mb-4 text-center sm:text-left">
              <DialogTitle className="text-2xl font-bold flex items-center justify-center sm:justify-start gap-2">
                <div className="p-2 bg-primary/10 rounded-xl">
                  <Shield className="h-6 w-6 text-primary" />
                </div>
                Оплата тарифа
              </DialogTitle>
              <DialogDescription className="hidden" />
            </DialogHeader>

            <PaymentContent />

            <DialogFooter className="mt-4 sm:justify-center border-t border-border/50 pt-4">
              <Button variant="ghost" onClick={closePayment} disabled={payLoading} className="rounded-xl hover:bg-background/50 hover:text-foreground text-muted-foreground transition-colors">
                Отмена
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
