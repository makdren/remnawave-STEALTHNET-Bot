import cron from "node-cron";
import { prisma } from "../../db.js";
import { randomUUID } from "crypto";
import { activateTariffByPaymentId } from "../tariff/tariff-activation.service.js";
import { remnaGetUser, isRemnaConfigured } from "../remna/remna.client.js";
import { getSystemConfig } from "../client/client.service.js";
import { createYookassaAutopayment } from "../yookassa/yookassa.service.js";
import {
  notifyAutoRenewSuccess,
  notifyAutoRenewFailed,
  notifyAutoRenewUpcoming,
  notifyAutoRenewRetry,
  notifyAutoRenewYookassaSuccess,
  notifyAutoRenewYookassaFailed,
} from "../notification/telegram-notify.service.js";

// Run every hour at minute 0
export function startAutoRenewScheduler() {
  cron.schedule("0 * * * *", async () => {
    console.log("[auto-renew] Cron triggered, checking for subscriptions to renew...");
    try {
      await processAutoRenewals();
    } catch (e) {
      console.error("[auto-renew] Error in cron job:", e);
    }
  });
}

const DAY_MS = 24 * 60 * 60 * 1000;

export async function processAutoRenewals() {
  if (!isRemnaConfigured()) {
    console.warn("[auto-renew] Remna is not configured. Skipping.");
    return;
  }

  // Load configurable settings
  const config = await getSystemConfig();
  const daysBeforeExpiry = config.autoRenewDaysBeforeExpiry ?? 1;
  const notifyDaysBefore = config.autoRenewNotifyDaysBefore ?? 3;
  const gracePeriodDays = config.autoRenewGracePeriodDays ?? 2;
  const maxRetries = config.autoRenewMaxRetries ?? 3;

  const renewThreshold = daysBeforeExpiry * DAY_MS;
  const notifyThreshold = notifyDaysBefore * DAY_MS;
  const gracePeriod = gracePeriodDays * DAY_MS;

  // Find clients with autoRenewEnabled and an associated tariff
  const clients = await prisma.client.findMany({
    where: {
      autoRenewEnabled: true,
      autoRenewTariffId: { not: null },
      remnawaveUuid: { not: null },
      isBlocked: false,
    },
    include: { autoRenewTariff: true },
  });

  const now = Date.now();

  for (const client of clients) {
    if (!client.remnawaveUuid || !client.autoRenewTariff) continue;

    try {
      // Get current expireAt from Remna
      const remnaUser = await remnaGetUser(client.remnawaveUuid);
      if (remnaUser.error) {
        console.error(`[auto-renew] Failed to fetch remna user ${client.remnawaveUuid}:`, remnaUser.error);
        continue;
      }

      const userData = (remnaUser.data as Record<string, unknown>)?.response ?? (remnaUser.data as Record<string, unknown>);
      if (!userData || typeof userData !== "object") continue;
      const expireAtRaw = (userData as Record<string, unknown>).expireAt;
      if (!expireAtRaw) continue;

      const expireAtDate = new Date(expireAtRaw as string);
      if (Number.isNaN(expireAtDate.getTime())) continue;

      const timeLeft = expireAtDate.getTime() - now;

      // === Phase 1: "Upcoming charge" notification ===
      // Notify when timeLeft <= notifyThreshold AND hasn't been notified in the last 24h
      if (timeLeft > 0 && timeLeft <= notifyThreshold) {
        const shouldNotify =
          !client.autoRenewNotifiedAt ||
          now - client.autoRenewNotifiedAt.getTime() > DAY_MS;

        if (shouldNotify && client.balance < client.autoRenewTariff.price) {
          await notifyAutoRenewUpcoming(
            client.id,
            client.autoRenewTariff.name,
            client.autoRenewTariff.price,
            client.autoRenewTariff.currency,
            Math.max(0, Math.ceil(timeLeft / DAY_MS)),
          );
          await prisma.client.update({
            where: { id: client.id },
            data: { autoRenewNotifiedAt: new Date() },
          });
        }
      }

      // === Phase 2: Renewal logic ===
      // Only attempt renewal when within threshold, and not expired too long ago (3 days max)
      if (timeLeft <= renewThreshold && timeLeft >= -(3 * DAY_MS)) {
        const tariffPrice = client.autoRenewTariff.price;

        if (client.balance >= tariffPrice) {
          // Enough balance → RENEW
          await prisma.$transaction(async (tx) => {
            await tx.client.update({
              where: { id: client.id },
              data: {
                balance: { decrement: tariffPrice },
                autoRenewRetryCount: 0, // reset retries on success
                autoRenewNotifiedAt: null, // reset notification flag
              },
            });

            const payment = await tx.payment.create({
              data: {
                clientId: client.id,
                orderId: randomUUID(),
                amount: tariffPrice,
                currency: client.autoRenewTariff!.currency.toUpperCase(),
                status: "PAID",
                provider: "balance",
                tariffId: client.autoRenewTariff!.id,
                paidAt: new Date(),
              },
            });

            const activationRes = await activateTariffByPaymentId(payment.id);
            if (!activationRes.ok) {
              throw new Error(`Activation failed: ${activationRes.error}`);
            }

            // Distribute referral rewards asynchronously
            import("../referral/referral.service.js")
              .then((m) => m.distributeReferralRewards(payment.id))
              .catch((e) => console.error("[auto-renew] Referral reward error:", e));
          });

          await notifyAutoRenewSuccess(
            client.id,
            client.autoRenewTariff.name,
            tariffPrice,
            client.autoRenewTariff.currency,
          );
          console.log(`[auto-renew] Client ${client.id} successfully renewed.`);
        } else {
          // Insufficient balance → try partial balance + YooKassa for the remainder, otherwise retry or disable
          let yookassaPaid = false;

          if (
            config.yookassaRecurringEnabled &&
            client.yookassaPaymentMethodId &&
            config.yookassaShopId?.trim() &&
            config.yookassaSecretKey?.trim()
          ) {
            // Calculate how much to charge from card vs balance
            const balancePortion = Math.min(client.balance, tariffPrice);
            const cardPortion = tariffPrice - balancePortion;

            // Attempt YooKassa autopayment for the shortfall only
            const orderId = randomUUID();
            const serviceName = config.serviceName?.trim() || "STEALTHNET";
            const autopayResult = await createYookassaAutopayment({
              shopId: config.yookassaShopId.trim(),
              secretKey: config.yookassaSecretKey.trim(),
              amount: cardPortion,
              currency: client.autoRenewTariff!.currency.toUpperCase(),
              paymentMethodId: client.yookassaPaymentMethodId,
              description: `Автопродление ${serviceName}`,
              metadata: { auto_renew: "true", client_id: client.id },
              customerEmail: client.email,
            });

            if (autopayResult.ok) {
              // Автоплатёж прошёл — списываем баланс (если есть) + создаём Payment, активируем тариф
              const payment = await prisma.$transaction(async (tx) => {
                if (balancePortion > 0) {
                  await tx.client.update({
                    where: { id: client.id },
                    data: { balance: { decrement: balancePortion } },
                  });
                }

                return tx.payment.create({
                  data: {
                    clientId: client.id,
                    orderId,
                    amount: tariffPrice,
                    currency: client.autoRenewTariff!.currency.toUpperCase(),
                    status: "PAID",
                    provider: "yookassa",
                    tariffId: client.autoRenewTariff!.id,
                    paidAt: new Date(),
                    externalId: autopayResult.paymentId,
                  },
                });
              });

              const activationRes = await activateTariffByPaymentId(payment.id);
              if (activationRes.ok) {
                await prisma.client.update({
                  where: { id: client.id },
                  data: {
                    autoRenewRetryCount: 0,
                    autoRenewNotifiedAt: null,
                  },
                });

                // Distribute referral rewards asynchronously
                import("../referral/referral.service.js")
                  .then((m) => m.distributeReferralRewards(payment.id))
                  .catch((e) => console.error("[auto-renew] Referral reward error:", e));

                await notifyAutoRenewYookassaSuccess(
                  client.id,
                  client.autoRenewTariff!.name,
                  tariffPrice,
                  client.autoRenewTariff!.currency,
                  client.yookassaPaymentMethodTitle ?? undefined,
                  balancePortion > 0 ? balancePortion : undefined,
                  cardPortion,
                );
                console.log(`[auto-renew] Client ${client.id} renewed via YooKassa (card: ${cardPortion}, balance: ${balancePortion}).`);
                yookassaPaid = true;
              } else {
                console.error(`[auto-renew] Client ${client.id} YooKassa paid but activation failed:`, activationRes.error);
              }
            } else {
              // Автоплатёж не прошёл
              await notifyAutoRenewYookassaFailed(
                client.id,
                client.autoRenewTariff!.name,
                autopayResult.error,
              );
              console.log(`[auto-renew] Client ${client.id} YooKassa autopayment failed: ${autopayResult.error}`);
            }
          }

          if (!yookassaPaid) {
            // Fallback to retry/disable logic
            const currentRetryCount = client.autoRenewRetryCount ?? 0;

            if (currentRetryCount < maxRetries) {
              // Still have retries left — increment counter, notify retry
              const newRetryCount = currentRetryCount + 1;
              await prisma.client.update({
                where: { id: client.id },
                data: { autoRenewRetryCount: newRetryCount },
              });

              await notifyAutoRenewRetry(
                client.id,
                client.autoRenewTariff.name,
                tariffPrice,
                client.autoRenewTariff.currency,
                newRetryCount,
                maxRetries,
              );
              console.log(
                `[auto-renew] Client ${client.id} insufficient balance. Retry ${newRetryCount}/${maxRetries}.`,
              );
            } else {
              // All retries exhausted — check grace period
              const expiredSince = timeLeft < 0 ? Math.abs(timeLeft) : 0;

              if (expiredSince >= gracePeriod) {
                // Grace period over → disable auto-renewal
                await prisma.client.update({
                  where: { id: client.id },
                  data: {
                    autoRenewEnabled: false,
                    autoRenewRetryCount: 0,
                    autoRenewNotifiedAt: null,
                  },
                });
                await notifyAutoRenewFailed(
                  client.id,
                  client.autoRenewTariff.name,
                  "balance",
                );
                console.log(
                  `[auto-renew] Client ${client.id} failed: all retries exhausted + grace period over. Auto-renew disabled.`,
                );
              } else {
                // Still within grace period — keep trying each hour
                console.log(
                  `[auto-renew] Client ${client.id} retries exhausted but grace period active. Will keep checking.`,
                );
              }
            }
          }
        }
      }
    } catch (e) {
      console.error(`[auto-renew] Error processing client ${client.id}:`, e);

      // On unexpected error → use retry logic instead of instant disable
      const currentRetryCount = client.autoRenewRetryCount ?? 0;
      if (currentRetryCount < maxRetries) {
        await prisma.client
          .update({
            where: { id: client.id },
            data: { autoRenewRetryCount: currentRetryCount + 1 },
          })
          .catch((err) => console.error("[auto-renew] Failed to update retry count:", err));
      } else {
        // Retries exhausted on errors too → disable
        await prisma.client
          .update({
            where: { id: client.id },
            data: {
              autoRenewEnabled: false,
              autoRenewRetryCount: 0,
              autoRenewNotifiedAt: null,
            },
          })
          .catch((err) => console.error("[auto-renew] Failed to disable auto-renew on error:", err));

        await notifyAutoRenewFailed(client.id, client.autoRenewTariff.name, "error").catch(() => {});
      }
    }
  }
}
