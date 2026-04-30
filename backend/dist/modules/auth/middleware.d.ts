import { Request, Response, NextFunction } from "express";
export type AdminRole = "ADMIN" | "MANAGER";
export interface ReqAdmin {
    adminId: string;
    adminEmail: string;
    adminRole: AdminRole;
    adminAllowedSections: string[];
}
export declare function requireAuth(req: Request, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
/** После requireAuth: запрещает доступ менеджеру, если у него нет доступа к разделу текущего пути. */
export declare function requireAdminSection(req: Request, res: Response, next: NextFunction): void | Response<any, Record<string, any>>;
/** Если токен есть и валиден — добавляет adminId в req, иначе не блокирует (для опционального auth). */
export declare function optionalAuth(req: Request, res: Response, next: NextFunction): Promise<void>;
//# sourceMappingURL=middleware.d.ts.map