import { z } from "zod";
import "dotenv/config";
declare const envSchema: z.ZodObject<{
    NODE_ENV: z.ZodDefault<z.ZodEnum<["development", "production", "test"]>>;
    PORT: z.ZodDefault<z.ZodNumber>;
    DATABASE_URL: z.ZodString;
    JWT_SECRET: z.ZodString;
    JWT_ACCESS_EXPIRES_IN: z.ZodDefault<z.ZodString>;
    JWT_REFRESH_EXPIRES_IN: z.ZodDefault<z.ZodString>;
    REMNA_API_URL: z.ZodEffects<z.ZodOptional<z.ZodString>, string | undefined, unknown>;
    REMNA_ADMIN_TOKEN: z.ZodOptional<z.ZodString>;
    REMNA_SECRET_KEY: z.ZodOptional<z.ZodString>;
    CORS_ORIGIN: z.ZodDefault<z.ZodString>;
    /** Cron для авто-рассылки (например "0 9 * * *" = 9:00 каждый день). Пусто = по умолчанию 9:00. */
    AUTO_BROADCAST_CRON: z.ZodOptional<z.ZodString>;
    /** Cron для ежедневного напоминания об активном конкурсе (по умолчанию "0 10 * * *" = 10:00). */
    CONTEST_REMINDER_CRON: z.ZodOptional<z.ZodString>;
    /** Path to MaxMind GeoLite2-City.mmdb file for IP geolocation. */
    MAXMIND_DB_PATH: z.ZodOptional<z.ZodString>;
    /** MaxMind license key for automatic DB download (optional). */
    MAXMIND_LICENSE_KEY: z.ZodOptional<z.ZodString>;
    /** TTL (seconds) for the geo-map aggregated data cache. Default 60. */
    GEO_CACHE_TTL: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    NODE_ENV: "development" | "production" | "test";
    PORT: number;
    DATABASE_URL: string;
    JWT_SECRET: string;
    JWT_ACCESS_EXPIRES_IN: string;
    JWT_REFRESH_EXPIRES_IN: string;
    CORS_ORIGIN: string;
    GEO_CACHE_TTL: number;
    REMNA_API_URL?: string | undefined;
    REMNA_ADMIN_TOKEN?: string | undefined;
    REMNA_SECRET_KEY?: string | undefined;
    AUTO_BROADCAST_CRON?: string | undefined;
    CONTEST_REMINDER_CRON?: string | undefined;
    MAXMIND_DB_PATH?: string | undefined;
    MAXMIND_LICENSE_KEY?: string | undefined;
}, {
    DATABASE_URL: string;
    JWT_SECRET: string;
    NODE_ENV?: "development" | "production" | "test" | undefined;
    PORT?: number | undefined;
    JWT_ACCESS_EXPIRES_IN?: string | undefined;
    JWT_REFRESH_EXPIRES_IN?: string | undefined;
    REMNA_API_URL?: unknown;
    REMNA_ADMIN_TOKEN?: string | undefined;
    REMNA_SECRET_KEY?: string | undefined;
    CORS_ORIGIN?: string | undefined;
    AUTO_BROADCAST_CRON?: string | undefined;
    CONTEST_REMINDER_CRON?: string | undefined;
    MAXMIND_DB_PATH?: string | undefined;
    MAXMIND_LICENSE_KEY?: string | undefined;
    GEO_CACHE_TTL?: number | undefined;
}>;
export type Env = z.infer<typeof envSchema>;
export declare const env: {
    NODE_ENV: "development" | "production" | "test";
    PORT: number;
    DATABASE_URL: string;
    JWT_SECRET: string;
    JWT_ACCESS_EXPIRES_IN: string;
    JWT_REFRESH_EXPIRES_IN: string;
    CORS_ORIGIN: string;
    GEO_CACHE_TTL: number;
    REMNA_API_URL?: string | undefined;
    REMNA_ADMIN_TOKEN?: string | undefined;
    REMNA_SECRET_KEY?: string | undefined;
    AUTO_BROADCAST_CRON?: string | undefined;
    CONTEST_REMINDER_CRON?: string | undefined;
    MAXMIND_DB_PATH?: string | undefined;
    MAXMIND_LICENSE_KEY?: string | undefined;
};
export {};
//# sourceMappingURL=env.d.ts.map