/**
 * Интеграция с API кошелька ЮMoney (OAuth, request-payment, process-payment).
 * Документация: https://yoomoney.ru/docs/wallet
 */
export declare function getAuthUrl(params: {
    clientId: string;
    redirectUri: string;
    state: string;
    scope?: string;
}): string;
export declare function exchangeCodeForToken(params: {
    code: string;
    clientId: string;
    redirectUri: string;
    clientSecret?: string | null;
}): Promise<{
    access_token: string;
} | {
    error: string;
}>;
/** Ответ request-payment: success + request_id + money_source или refused + error */
export type RequestPaymentResult = {
    status: "success";
    request_id: string;
    money_source: Record<string, unknown>;
    balance?: number;
    contract_amount?: number;
} | {
    status: "refused";
    error: string;
    error_description?: string;
};
export declare function requestPayment(accessToken: string, params: {
    to: string;
    amount_due: number;
    label: string;
    message?: string;
    comment?: string;
}): Promise<RequestPaymentResult>;
/** Ответ process-payment: success | refused | in_progress | ext_auth_required */
export type ProcessPaymentResult = {
    status: "success";
    payment_id?: string;
    balance?: number;
} | {
    status: "refused";
    error: string;
} | {
    status: "in_progress";
    next_retry?: number;
} | {
    status: "ext_auth_required";
    acs_uri?: string;
    acs_params?: Record<string, string>;
};
export declare function processPayment(accessToken: string, params: {
    request_id: string;
    money_source?: string;
    csc?: string;
}): Promise<ProcessPaymentResult>;
//# sourceMappingURL=yoomoney.service.d.ts.map