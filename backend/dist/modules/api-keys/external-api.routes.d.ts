/**
 * External API v1 — all client-facing endpoints exposed via API key.
 * Auth: X-Api-Key header (validated by requireApiKey middleware).
 * Client auth: after login, use Authorization: Bearer <clientToken> for protected routes.
 */
export declare const externalApiRouter: import("express-serve-static-core").Router;
//# sourceMappingURL=external-api.routes.d.ts.map