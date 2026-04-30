/**
 * Отметить платёж как оплаченный: обновление статуса, начисление баланса (топ-ап),
 * активация тарифа/прокси/singbox, реферальные бонусы.
 * Используется в веб-админке и в бот-админке.
 */
import { prisma } from "../../db.js";
import { distributeReferralRewards } from "../referral/referral.service.js";
export type MarkPaymentPaidResult = {
    ok: boolean;
    payment: Awaited<ReturnType<typeof prisma.payment.findUnique>>;
    referral?: Awaited<ReturnType<typeof distributeReferralRewards>>;
    activation?: {
        ok: boolean;
        error?: string;
    };
    proxySlots?: {
        ok: boolean;
        slotsCreated?: number;
        error?: string;
    };
    balanceCredited?: boolean;
    error?: string;
};
export declare function markPaymentPaid(paymentId: string): Promise<MarkPaymentPaidResult>;
//# sourceMappingURL=mark-paid.service.d.ts.map