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

/** Объединить сквады тарифа с текущими сквадами пользователя (тариф в приоритете, доп. сквады сохраняются). */
function mergeSquads(tariffSquadUuids: string[], currentSquadUuids: string[]): string[] {
  const extra = currentSquadUuids.filter((u) => !tariffSquadUuids.includes(u));
  return [...tariffSquadUuids, ...extra];
}

export type TrafficResetMode = "no_reset" | "on_purchase" | "monthly";

function remnaStrategy(mode: TrafficResetMode): "NO_RESET" | "MONTH" {
  return mode === "monthly" ? "MONTH" : "NO_RESET";
}

/**
 * Активирует тариф для клиента в Remnawave:
 * - обновляет/создаёт пользователя с expireAt, trafficLimitBytes (в байтах), deviceLimit
 * - назначает activeInternalSquads
 * - При повторной покупке ДОБАВЛЯЕТ дни к текущему сроку подписки
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
  tariff: { durationDays: number; trafficLimitBytes: bigint | null; deviceLimit: number | null; internalSquadUuids: string[]; trafficResetMode?: string },
): Promise<ActivationResult> {
  if (!isRemnaConfigured()) return { ok: false, error: "Сервис временно недоступен", status: 503 };

  const trafficLimitBytes = tariff.trafficLimitBytes != null ? Number(tariff.trafficLimitBytes) : 0;
  const hwidDeviceLimit = tariff.deviceLimit ?? null;
  const resetMode: TrafficResetMode = (tariff.trafficResetMode as TrafficResetMode) || "no_reset";
  const trafficLimitStrategy = remnaStrategy(resetMode);
  const shouldResetTraffic = resetMode === "on_purchase" || resetMode === "monthly";

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
    const expireAt = calculateExpireAt(currentExpireAt, tariff.durationDays);
    const activeInternalSquads = mergeSquads(tariff.internalSquadUuids, currentSquads);

    if (shouldResetTraffic) {
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

    const expireAt = calculateExpireAt(currentExpireAt, tariff.durationDays);

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
    const activeInternalSquads = mergeSquads(tariff.internalSquadUuids, currentSquads);
    await remnaUpdateUser({ uuid: existingUuid, expireAt, trafficLimitBytes, trafficLimitStrategy, hwidDeviceLimit, activeInternalSquads });
    await prisma.client.update({ where: { id: client.id }, data: { remnawaveUuid: existingUuid } });
  }
  return { ok: true };
}

/**
 * Активация тарифа по paymentId — находит клиента и тариф из Payment (или customBuild из metadata), вызывает activateTariffForClient.
 */
export async function activateTariffByPaymentId(paymentId: string): Promise<ActivationResult> {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    select: { tariffId: true, clientId: true, metadata: true },
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

  if (payment.tariffId) {
    const tariff = await prisma.tariff.findUnique({ where: { id: payment.tariffId } });
    if (!tariff) {
      return { ok: false, error: "Тариф не найден", status: 404 };
    }
    return activateTariffForClient(client, tariff);
  }

  const customBuild = parseCustomBuildMetadata(payment.metadata);
  if (customBuild) {
    return activateTariffForClient(client, customBuild);
  }

  return { ok: false, error: "Тариф не привязан к платежу", status: 400 };
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
