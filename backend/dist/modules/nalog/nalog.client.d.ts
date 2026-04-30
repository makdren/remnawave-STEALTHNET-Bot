/**
 * HTTP-клиент для API «Мой Налог» (lknpd.nalog.ru) — регистрация доходов самозанятых.
 * Реализация на основе API из PHP-библиотеки shoman4eg/moy-nalog и Python-порта nalogo.
 */
export interface NalogTokens {
    token: string;
    refreshToken: string;
    tokenExpireIn: string;
}
export interface NalogDeviceInfo {
    sourceDeviceId: string;
    sourceType: string;
    appVersion: string;
    metaDetails: Record<string, unknown>;
}
export interface NalogServiceItem {
    name: string;
    amount: number;
    quantity: number;
}
export interface NalogIncomeClient {
    contactPhone?: string;
    displayName?: string;
    incomeType: "FROM_INDIVIDUAL" | "FROM_LEGAL_ENTITY" | "FROM_FOREIGN_AGENCY";
    inn?: string;
}
export interface CreateIncomeParams {
    paymentType: "CASH" | "ACCOUNT";
    services: NalogServiceItem[];
    totalAmount: number;
    operationTime: string;
    client?: NalogIncomeClient | null;
}
export interface CreateIncomeResult {
    approvedReceiptUuid: string;
}
export declare function nalogAuth(inn: string, password: string, deviceId: string): Promise<NalogTokens>;
export declare function nalogRefreshToken(refreshToken: string, deviceId: string): Promise<NalogTokens>;
export declare function nalogCreateIncome(token: string, params: CreateIncomeParams): Promise<CreateIncomeResult>;
export declare function nalogCancelIncome(token: string, receiptUuid: string, comment: string): Promise<void>;
export declare function nalogReceiptPrintUrl(receiptUuid: string): string;
//# sourceMappingURL=nalog.client.d.ts.map