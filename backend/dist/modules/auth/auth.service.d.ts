import type { Env } from "../../config/env.js";
export interface TokenPayload {
    adminId: string;
    email: string;
    type: "access" | "refresh";
}
export interface Admin2FAPendingPayload {
    adminId: string;
    email: string;
    type: "admin_2fa_pending";
}
export declare function hashPassword(password: string): Promise<string>;
export declare function verifyPassword(password: string, hash: string): Promise<boolean>;
export declare function signAccessToken(payload: Omit<TokenPayload, "type">, secret: string, expiresIn: string): string;
export declare function signRefreshToken(payload: Omit<TokenPayload, "type">, secret: string, expiresIn: string): string;
export declare function verifyToken(token: string, secret: string): TokenPayload | null;
/** Временный токен для шага 2FA после проверки пароля админа. Живёт 5 минут. */
export declare function signAdmin2FAPendingToken(payload: {
    adminId: string;
    email: string;
}, secret: string, expiresIn?: string): string;
export declare function verifyAdmin2FAPendingToken(token: string, secret: string): Admin2FAPendingPayload | null;
export declare function createAdmin(email: string, password: string): Promise<{
    id: string;
    email: string;
    passwordHash: string;
    mustChangePassword: boolean;
    role: string;
    allowedSections: string | null;
    totpSecret: string | null;
    totpEnabled: boolean;
    createdAt: Date;
    updatedAt: Date;
}>;
export declare function ensureFirstAdmin(env: Env): Promise<{
    id: string;
    email: string;
    passwordHash: string;
    mustChangePassword: boolean;
    role: string;
    allowedSections: string | null;
    totpSecret: string | null;
    totpEnabled: boolean;
    createdAt: Date;
    updatedAt: Date;
} | null>;
//# sourceMappingURL=auth.service.d.ts.map