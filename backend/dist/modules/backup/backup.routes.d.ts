/**
 * Роуты бэкапа: создание (сохранение на диск + скачивание), список, скачивание, восстановление
 */
import { Request, Response } from "express";
export declare function registerBackupRoutes(router: import("express").Router, asyncRoute: (fn: (req: Request, res: Response) => Promise<void | Response>) => (req: Request, res: Response, next: () => void) => void): void;
//# sourceMappingURL=backup.routes.d.ts.map