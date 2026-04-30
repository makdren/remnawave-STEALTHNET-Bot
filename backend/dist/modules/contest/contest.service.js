/**
 * Конкурсы: участники по условиям, розыгрыш (random / по дням / по кол-ву оплат), начисление призов.
 */
import { prisma } from "../../db.js";
export function parseConditions(json) {
    if (!json?.trim())
        return {};
    try {
        const o = JSON.parse(json);
        return {
            minTariffDays: typeof o.minTariffDays === "number" ? o.minTariffDays : undefined,
            minPaymentsCount: typeof o.minPaymentsCount === "number" ? o.minPaymentsCount : undefined,
            minReferrals: typeof o.minReferrals === "number" ? o.minReferrals : undefined,
        };
    }
    catch {
        return {};
    }
}
/**
 * Возвращает список clientId, подходящих под условия конкурса (оплаты в периоде [startAt, endAt]).
 * Для каждого клиента считает totalDaysBought и paymentsCount (только оплаченные тарифы VPN, не прокси/singbox).
 */
export async function getEligibleParticipants(startAt, endAt, conditions) {
    const minDays = conditions.minTariffDays ?? 0;
    const minPayments = conditions.minPaymentsCount ?? 1;
    const minReferrals = conditions.minReferrals ?? 0;
    const payments = await prisma.payment.findMany({
        where: {
            status: "PAID",
            paidAt: { gte: startAt, lte: endAt },
            tariffId: { not: null },
            tariff: minDays > 0 ? { durationDays: { gte: minDays } } : undefined,
        },
        select: {
            clientId: true,
            tariff: { select: { durationDays: true } },
        },
    });
    const byClient = new Map();
    for (const p of payments) {
        const t = byClient.get(p.clientId) ?? { totalDays: 0, count: 0 };
        t.totalDays += p.tariff?.durationDays ?? 0;
        t.count += 1;
        byClient.set(p.clientId, t);
    }
    let out = [];
    for (const [clientId, { totalDays, count }] of byClient) {
        if (count >= minPayments) {
            out.push({ clientId, totalDaysBought: totalDays, paymentsCount: count });
        }
    }
    if (out.length > 0) {
        const clientIds = new Set(out.map((p) => p.clientId));
        const referralCounts = await prisma.client.groupBy({
            by: ["referrerId"],
            where: { referrerId: { in: [...clientIds] } },
            _count: { id: true },
        });
        const countByReferrer = new Map();
        for (const r of referralCounts) {
            if (r.referrerId)
                countByReferrer.set(r.referrerId, r._count.id);
        }
        out = out.map((p) => ({ ...p, referralsCount: countByReferrer.get(p.clientId) ?? 0 }));
        if (minReferrals > 0) {
            out = out.filter((p) => (p.referralsCount ?? 0) >= minReferrals);
        }
    }
    return out;
}
/**
 * Выбирает 3 победителей по правилу drawType и возвращает [clientId1, clientId2, clientId3] (места 1, 2, 3).
 */
export function selectWinners(participants, drawType) {
    if (participants.length < 3)
        return null;
    let ordered;
    if (drawType === "by_days_bought") {
        ordered = [...participants].sort((a, b) => b.totalDaysBought - a.totalDaysBought);
    }
    else if (drawType === "by_payments_count") {
        ordered = [...participants].sort((a, b) => b.paymentsCount - a.paymentsCount);
    }
    else if (drawType === "by_referrals_count") {
        ordered = [...participants].sort((a, b) => (b.referralsCount ?? 0) - (a.referralsCount ?? 0));
    }
    else {
        // random: shuffle and take first 3
        ordered = [...participants];
        for (let i = ordered.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [ordered[i], ordered[j]] = [ordered[j], ordered[i]];
        }
    }
    return [ordered[0].clientId, ordered[1].clientId, ordered[2].clientId];
}
/**
 * Проводит розыгрыш: создаёт записи ContestWinner и при необходимости начисляет призы (balance / vpn_days).
 */
export async function runDraw(contestId) {
    const contest = await prisma.contest.findUnique({
        where: { id: contestId },
        include: { winners: true },
    });
    if (!contest)
        return { ok: false, error: "Конкурс не найден" };
    if (contest.status === "drawn")
        return { ok: false, error: "Розыгрыш уже проведён" };
    if (contest.winners.length > 0)
        return { ok: false, error: "Победители уже записаны" };
    const conditions = parseConditions(contest.conditionsJson);
    const participants = await getEligibleParticipants(contest.startAt, contest.endAt, conditions);
    const winnerIds = selectWinners(participants, contest.drawType);
    if (!winnerIds) {
        await prisma.contest.update({
            where: { id: contestId },
            data: { status: "ended" },
        });
        return { ok: false, error: "Недостаточно участников (нужно минимум 3)" };
    }
    const prizes = [
        { place: 1, type: contest.prize1Type, value: contest.prize1Value },
        { place: 2, type: contest.prize2Type, value: contest.prize2Value },
        { place: 3, type: contest.prize3Type, value: contest.prize3Value },
    ];
    for (let i = 0; i < 3; i++) {
        await prisma.contestWinner.create({
            data: {
                contestId,
                clientId: winnerIds[i],
                place: i + 1,
                prizeType: prizes[i].type,
                prizeValue: prizes[i].value,
            },
        });
    }
    await prisma.contest.update({
        where: { id: contestId },
        data: { status: "drawn" },
    });
    // Применяем призы: balance и vpn_days
    for (let i = 0; i < 3; i++) {
        const prize = prizes[i];
        const clientId = winnerIds[i];
        if (prize.type === "balance") {
            const amount = parseFloat(prize.value);
            if (!Number.isNaN(amount) && amount > 0) {
                await prisma.client.update({
                    where: { id: clientId },
                    data: { balance: { increment: amount } },
                });
                await prisma.contestWinner.updateMany({
                    where: { contestId, clientId, place: i + 1 },
                    data: { appliedAt: new Date() },
                });
            }
        }
        // vpn_days: можно начислить через Remna или записать и отображать в админке для ручного начисления
        // Пока только помечаем appliedAt при ручном начислении или оставляем без auto-apply
    }
    const winners = await prisma.contestWinner.findMany({
        where: { contestId },
        include: { client: { select: { id: true, email: true, telegramId: true, telegramUsername: true } } },
        orderBy: { place: "asc" },
    });
    return { ok: true, winners };
}
//# sourceMappingURL=contest.service.js.map