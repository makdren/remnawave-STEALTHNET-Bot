import { Request, Response, NextFunction } from "express";
export interface ApiKeyRequest extends Request {
    apiKeyId?: string;
    apiKeyName?: string;
}
export declare function requireApiKey(req: Request, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=api-key.middleware.d.ts.map