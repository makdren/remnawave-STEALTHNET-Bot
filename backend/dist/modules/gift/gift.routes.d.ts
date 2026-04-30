/**
 * Роуты дополнительных подписок и подарков (v2).
 *
 * Authed endpoints: requireClientAuth (монтируется в app.ts).
 * Клиент ID берётся из req.clientId (проставляется middleware).
 *
 * Public endpoints (no auth): GET /public/gift/:code
 */
export declare const giftPublicRouter: import("express-serve-static-core").Router;
export declare const giftRouter: import("express-serve-static-core").Router;
//# sourceMappingURL=gift.routes.d.ts.map