/**
 * Сервис активации тарифа в Remnawave для конкретного клиента.
 * Используется из: оплата балансом, вебхук Platega, админ mark-as-paid.
 */

import { prisma } from "../../db.js";
import {
  remnaCreateUser,
  remnaUpdateUser,
  remnaGetUser,
  isRemnaConfigured,
  remnaGetUserByTelegramId,
  remnaGetUserByEmail,
  extractRemnaUuid,
  remnaUsernameFromClient,
  remnaResetUserTraffic,
} from "../remna/remna.client.js";
import { createAdditionalSubscription } from "../gift/gift.service.js";

export type ActivationResult = { ok: true } | { ok: false; error: string; status: number };

/**
 * Извлекает текущий expireAt из ответа Remna GET /api/users/{uuid}.
 * Возвращает Date если дата валидна и в будущем, иначе null.
 */
function extractCurrentExpireAt(data: unknown): Date | null {
  if (!data || typeof data !== "object") return null;
  const o = data as Record<string, unknown>;
  const resp = (o.response ?? o.data ?? o) as Record<string, unknown>;
  const raw = resp?.expireAt;
  if (typeof raw !== "string") return null;
  try {
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) return null;
    // Только если дата в будущем — можно к ней добавлять
    return d.getTime() > Date.now() ? d : null;
  } catch {
    return null;
  }
}

/**
 * Считает новый expireAt:
 * - Если у пользователя уже есть активная подписка (expireAt в будущем) — добавляет durationDays к текущему expireAt
 * - Иначе — от текущего момента + durationDays
 */
function calculateExpireAt(currentExpireAt: Date | null, durationDays: number): string {
  const base = currentExpireAt ?? new Date();
  return new Date(base.getTime() + durationDays * 24 * 60 * 60 * 1000).toISOString();
}

/** Извлечь activeInternalSquads (uuid[]) из ответа Remna — чтобы мержить со сквадами тарифа и не затирать доп. опции. */
function extractCurrentSquads(data: unknown): string[] {
  if (!data || typeof data !== "object") return [];
  const resp = (data as Record<string, unknown>).response ?? (data as Record<string, unknown>).data ?? data;
  const ais = (resp as Record<string, unknown>)?.activeInternalSquads;
  if (!Array.isArray(ais)) return [];
  const out: string[] = [];
  for (const s of ais) {
    const u = s && typeof s === "object" && "uuid" in s ? (s as Record<string, unknown>).uuid : s;
    if (typeof u === "string") out.push(u);
  }
  return out;
}

/**
 * Собрать все сквады, которые относятся к каким-либо тарифам (primary-тарифы из БД).
 * Используется чтобы отличить «тарифный» сквад от add-on-сквада (покупка опции «сервер»,
 * подарок и т. д.). Тарифные сквады заменяются при смене тарифа, остальные сохраняются.
 */
async function getAllTariffSquadUuids(): Promise<Set<string>> {
  const tariffs = await prisma.tariff.findMany({ select: { internalSquadUuids: true } });
  const set = new Set<string>();
  for (const t of tariffs) {
    for (const u of t.internalSquadUuids) set.add(u);
  }
  return set;
}

/**
 * Объединить сквады тарифа с текущими сквадами пользователя.
 * Тарифные сквады старого тарифа замещаются новыми; add-on сквады (не относящиеся
 * ни к одному тарифу — покупки опции «серверы», подарки) — сохраняются.
 */
async function mergeSquads(tariffSquadUuids: string[], currentSquadUuids: string[]): Promise<string[]> {
  const allTariffSquads = await getAllTariffSquadUuids();
  const preserved = currentSquadUuids.filter((u) => !allTariffSquads.has(u) && !tariffSquadUuids.includes(u));
  return [...tariffSquadUuids, ...preserved];
}

export type TrafficResetMode = "no_reset" | "on_purchase" | "monthly" | "monthly_rolling";

function remnaStrategy(mode: TrafficResetMode): "NO_RESET" | "MONTH" | "MONTH_ROLLING" {
  if (mode === "monthly") return "MONTH";
  if (mode === "monthly_rolling") return "MONTH_ROLLING";
  return "NO_RESET";
}

/**
 * Рассчитать pro-rata конвертацию остатка дней при смене тарифа.
 * Возвращает количество "конвертированных" дней, которые добавляются к новой покупке.
 *
 * Формула: convertedDays = floor(remainingDays × oldPricePerDay / newPricePerDay)
 *
 * Применяется ТОЛЬКО когда:
 * - Был активный срок (currentExpireAt в будущем)
 * - У клиента сохранён currentPricePerDay (есть с чем сравнить)
 * - Меняется ТАРИФ (не просто продление того же)
 *
 * Для одного и того же тарифа дни складываются 1:1 (без конвертации) — даже если
 * выбрана опция с другой ставкой, юзер просто продлевает свой текущий тариф.
 */
function computeConvertedDays(args: {
  remainingDays: number;
  oldPricePerDay: number | null;
  newPricePerDay: number;
  isSameTariff: boolean;
}): number {
  const { remainingDays, oldPricePerDay, newPricePerDay, isSameTariff } = args;
  if (remainingDays <= 0) return 0;
  // Тот же тариф — просто стек, без конвертации
  if (isSameTariff) return remainingDays;
  // Нет ставки старого тарифа или нулевая новая — не можем считать, теряем остаток
  if (oldPricePerDay == null || oldPricePerDay <= 0) return 0;
  if (newPricePerDay <= 0) return remainingDays; // free → всё бесплатно, отдаём как есть
  const converted = Math.floor((remainingDays * oldPricePerDay) / newPricePerDay);
  return Math.max(0, converted);
}

/**
 * Активирует тариф для клиента в Remnawave:
 * - обновляет/создаёт пользователя с expireAt, trafficLimitBytes (в байтах), deviceLimit
 * - назначает activeInternalSquads
 * - При покупке другого тарифа применяет pro-rata конвертацию остатка
 * - При покупке того же тарифа — дни просто суммируются
 *
 * `selectedOption` — выбранная клиентом опция (длительность + цена). Если не задана,
 * fallback на legacy tariff.durationDays + tariff.price.
 *
 * Лимит трафика: в панели 1 ГБ = 1 ГиБ = 1024³ байт; в Remna передаём значение в байтах как есть.
 */
export async function activateTariffForClient(
  client: {
    id: string;
    remnawaveUuid: string | null;
    email: string | null;
    telegramId: string | null;
    telegramUsername?: string | null;
  },
  tariff: { id?: string; durationDays: number; trafficLimitBytes: bigint | null; deviceLimit: number | null; internalSquadUuids: string[]; trafficResetMode?: string; price?: number },
  selectedOption?: { durationDays: number; price: number },
): Promise<ActivationResult> {
  if (!isRemnaConfigured()) return { ok: false, error: "Сервис временно недоступен", status: 503 };

  // Эффективные значения из selectedOption (приоритет) или из legacy полей тарифа.
  const effectiveDays = selectedOption?.durationDays ?? tariff.durationDays;
  const effectivePrice = selectedOption?.price ?? tariff.price ?? 0;
  const newPricePerDay = effectiveDays > 0 ? effectivePrice / effectiveDays : 0;

  const trafficLimitBytes = tariff.trafficLimitBytes != null ? Number(tariff.trafficLimitBytes) : 0;
  const hwidDeviceLimit = tariff.deviceLimit ?? null;
  const resetMode: TrafficResetMode = (tariff.trafficResetMode as TrafficResetMode) || "no_reset";
  const trafficLimitStrategy = remnaStrategy(resetMode);
  const shouldResetTraffic = resetMode === "on_purchase" || resetMode === "monthly";

  // Загружаем сохранённое состояние клиента для конвертации.
  const dbClient = await prisma.client.findUnique({
    where: { id: client.id },
    select: { currentTariffId: true, currentPricePerDay: true },
  });
  const oldPricePerDay = dbClient?.currentPricePerDay ?? null;
  const oldTariffId = dbClient?.currentTariffId ?? null;
  const isSameTariff = !!(tariff.id && oldTariffId === tariff.id);

  let workingUuid = client.remnawaveUuid;

  if (workingUuid) {
    const userRes = await remnaGetUser(workingUuid);
    if (userRes.error || !userRes.data) {
      console.warn(`[tariff-activation] Remna user ${workingUuid} not found (status ${userRes.status}), will re-create`);
      workingUuid = null;
      await prisma.client.update({ where: { id: client.id }, data: { remnawaveUuid: null } });
    }
  }

  if (workingUuid) {
    const userRes = await remnaGetUser(workingUuid);
    const currentExpireAt = extractCurrentExpireAt(userRes.data);
    const currentSquads = extractCurrentSquads(userRes.data);

    // Конвертация остатка при смене тарифа. Если тариф тот же — convertedDays = remainingDays
    // (фактически calculateExpireAt(currentExpireAt, …) делает то же самое — стек).
    // Если тариф другой — конвертируем по формуле (remaining × old$/d / new$/d).
    let bonusDays = 0;
    if (currentExpireAt) {
      const remainingMs = currentExpireAt.getTime() - Date.now();
      const remainingDays = Math.max(0, remainingMs / (24 * 60 * 60 * 1000));
      bonusDays = computeConvertedDays({
        remainingDays,
        oldPricePerDay,
        newPricePerDay,
        isSameTariff,
      });
    }
    // Итог: now + (effectiveDays + bonusDays). Если bonusDays = remainingDays (стек),
    // эффект тот же что и calculateExpireAt(currentExpireAt, effectiveDays).
    const totalDays = effectiveDays + bonusDays;
    const expireAt = new Date(Date.now() + totalDays * 24 * 60 * 60 * 1000).toISOString();
    void calculateExpireAt;
    const activeInternalSquads = await mergeSquads(tariff.internalSquadUuids, currentSquads);

    // Сбрасываем трафик: либо явно указано в режиме тарифа, либо была активная подписка.
    const hadActiveSub = currentExpireAt !== null;
    if (shouldResetTraffic || hadActiveSub) {
      await remnaResetUserTraffic(workingUuid);
    }

    const updateRes = await remnaUpdateUser({
      uuid: workingUuid,
      expireAt,
      trafficLimitBytes,
      trafficLimitStrategy,
      hwidDeviceLimit,
      activeInternalSquads,
    });
    if (updateRes.error) {
      return { ok: false, error: updateRes.error, status: updateRes.status >= 400 ? updateRes.status : 500 };
    }
  } else {
    let existingUuid: string | null = null;
    let currentExpireAt: Date | null = null;

    if (client.telegramId?.trim()) {
      const byTgRes = await remnaGetUserByTelegramId(client.telegramId.trim());
      existingUuid = extractRemnaUuid(byTgRes.data);
      if (existingUuid) currentExpireAt = extractCurrentExpireAt(byTgRes.data);
    }
    if (!existingUuid && client.email?.trim()) {
      const byEmailRes = await remnaGetUserByEmail(client.email.trim());
      existingUuid = extractRemnaUuid(byEmailRes.data);
      if (existingUuid) currentExpireAt = extractCurrentExpireAt(byEmailRes.data);
    }

    // Применяем ту же логику конвертации для случая когда remna-юзер уже был
    // (например создан через бота / старый клиент).
    let bonusDays2 = 0;
    if (currentExpireAt) {
      const remainingMs = currentExpireAt.getTime() - Date.now();
      const remainingDays = Math.max(0, remainingMs / (24 * 60 * 60 * 1000));
      bonusDays2 = computeConvertedDays({
        remainingDays,
        oldPricePerDay,
        newPricePerDay,
        isSameTariff,
      });
    }
    const totalDays2 = effectiveDays + bonusDays2;
    const expireAt = currentExpireAt
      ? new Date(Date.now() + totalDays2 * 24 * 60 * 60 * 1000).toISOString()
      : new Date(Date.now() + effectiveDays * 24 * 60 * 60 * 1000).toISOString();

    if (!existingUuid) {
      const displayUsername = remnaUsernameFromClient({
        telegramUsername: client.telegramUsername,
        telegramId: client.telegramId,
        email: client.email,
        clientIdFallback: client.id,
      });
      const createRes = await remnaCreateUser({
        username: displayUsername,
        trafficLimitBytes,
        trafficLimitStrategy,
        expireAt,
        hwidDeviceLimit: hwidDeviceLimit ?? undefined,
        activeInternalSquads: tariff.internalSquadUuids,
        ...(client.telegramId?.trim() && { telegramId: parseInt(client.telegramId, 10) }),
        ...(client.email?.trim() && { email: client.email.trim() }),
      });
      existingUuid = extractRemnaUuid(createRes.data);
      if (!existingUuid && createRes.error) {
        console.error("[tariff-activation] Remna createUser failed:", createRes.error, createRes.status);
      }
    } else if (shouldResetTraffic) {
      await remnaResetUserTraffic(existingUuid);
    }
    if (!existingUuid) return { ok: false, error: "Ошибка создания пользователя VPN", status: 502 };

    const currentSquads = extractCurrentSquads((await remnaGetUser(existingUuid)).data);
    const activeInternalSquads = await mergeSquads(tariff.internalSquadUuids, currentSquads);
    await remnaUpdateUser({ uuid: existingUuid, expireAt, trafficLimitBytes, trafficLimitStrategy, hwidDeviceLimit, activeInternalSquads });
    await prisma.client.update({ where: { id: client.id }, data: { remnawaveUuid: existingUuid } });
  }

  // Сохраняем currentTariffId + currentPricePerDay как Source of Truth.
  // Используется для отображения названия тарифа и для конвертации при следующей смене.
  // Если активация была из customBuild — tariff.id может быть undefined; в этом случае
  // currentTariffId не трогаем, но currentPricePerDay всё равно обновляем (есть цена и дни).
  await prisma.client
    .update({
      where: { id: client.id },
      data: {
        ...(tariff.id ? { currentTariffId: tariff.id } : {}),
        currentPricePerDay: newPricePerDay > 0 ? newPricePerDay : null,
      },
    })
    .catch(() => {});

  return { ok: true };
}

/**
 * Активация тарифа по paymentId — находит клиента и тариф из Payment (или customBuild из metadata), вызывает activateTariffForClient.
 */
export async function activateTariffByPaymentId(paymentId: string): Promise<ActivationResult> {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    select: {
      tariffId: true,
      tariffPriceOptionId: true,
      clientId: true,
      metadata: true,
      tariffPriceOption: { select: { durationDays: true, price: true } },
    },
  });
  if (!payment) {
    return { ok: false, error: "Платёж не найден", status: 404 };
  }

  const client = await prisma.client.findUnique({
    where: { id: payment.clientId },
    select: { id: true, remnawaveUuid: true, email: true, telegramId: true, telegramUsername: true },
  });
  if (!client) {
    return { ok: false, error: "Клиент не найден", status: 404 };
  }

  // Проверяем, является ли это покупкой дополнительной подписки
  const isAdditional = isAdditionalSubscriptionPayment(payment.metadata);

  if (payment.tariffId) {
    const tariff = await prisma.tariff.findUnique({ where: { id: payment.tariffId } });
    if (!tariff) {
      return { ok: false, error: "Тариф не найден", status: 404 };
    }

    // Опция выбора (длительность + цена). Если в платеже сохранён tariffPriceOptionId,
    // используем его; иначе fallback на legacy поля тарифа.
    const selectedOption = payment.tariffPriceOption
      ? { durationDays: payment.tariffPriceOption.durationDays, price: payment.tariffPriceOption.price }
      : undefined;

    if (isAdditional) {
      const result = await createAdditionalSubscription(client.id, {
        durationDays: selectedOption?.durationDays ?? tariff.durationDays,
        trafficLimitBytes: tariff.trafficLimitBytes,
        deviceLimit: tariff.deviceLimit,
        internalSquadUuids: tariff.internalSquadUuids,
        trafficResetMode: tariff.trafficResetMode ?? undefined,
      });
      return result.ok ? { ok: true } : { ok: false, error: result.error, status: result.status };
    }

    return activateTariffForClient(client, tariff, selectedOption);
  }

  const customBuild = parseCustomBuildMetadata(payment.metadata);
  if (customBuild) {
    if (isAdditional) {
      const result = await createAdditionalSubscription(client.id, customBuild);
      return result.ok ? { ok: true } : { ok: false, error: result.error, status: result.status };
    }
    return activateTariffForClient(client, customBuild);
  }

  return { ok: false, error: "Тариф не привязан к платежу", status: 400 };
}

/** Проверяет, содержит ли metadata флаг isAdditionalSubscription. */
function isAdditionalSubscriptionPayment(metadata: string | null): boolean {
  if (!metadata?.trim()) return false;
  try {
    const o = JSON.parse(metadata) as Record<string, unknown>;
    return o?.isAdditionalSubscription === true;
  } catch {
    return false;
  }
}

function parseCustomBuildMetadata(metadata: string | null): { durationDays: number; trafficLimitBytes: bigint | null; deviceLimit: number | null; internalSquadUuids: string[] } | null {
  if (!metadata?.trim()) return null;
  try {
    const o = JSON.parse(metadata) as Record<string, unknown>;
    const cb = o?.customBuild as Record<string, unknown> | undefined;
    if (!cb || typeof cb !== "object") return null;
    const durationDays = typeof cb.durationDays === "number" ? cb.durationDays : 0;
    const deviceLimit = typeof cb.deviceLimit === "number" ? cb.deviceLimit : null;
    const internalSquadUuids = Array.isArray(cb.internalSquadUuids)
      ? (cb.internalSquadUuids as string[]).filter((u) => typeof u === "string" && u.trim())
      : [];
    const trafficLimitBytes =
      typeof cb.trafficLimitBytes === "number" && cb.trafficLimitBytes >= 0
        ? BigInt(Math.floor(cb.trafficLimitBytes))
        : typeof cb.trafficLimitBytes === "string"
          ? BigInt(cb.trafficLimitBytes)
          : null;
    if (durationDays < 1 || internalSquadUuids.length === 0) return null;
    return { durationDays, trafficLimitBytes, deviceLimit, internalSquadUuids };
  } catch {
    return null;
  }
}
