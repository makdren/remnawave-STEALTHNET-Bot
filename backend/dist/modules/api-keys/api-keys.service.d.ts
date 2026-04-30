export declare function generateApiKey(): {
    raw: string;
    prefix: string;
    hash: string;
};
export declare function createApiKey(name: string, description?: string): Promise<{
    rawKey: string;
    name: string;
    id: string;
    createdAt: Date;
    description: string | null;
    isActive: boolean;
    keyHash: string;
    prefix: string;
    lastUsedAt: Date | null;
}>;
export declare function listApiKeys(): Promise<{
    name: string;
    id: string;
    createdAt: Date;
    description: string | null;
    isActive: boolean;
    prefix: string;
    lastUsedAt: Date | null;
}[]>;
export declare function deleteApiKey(id: string): Promise<{
    name: string;
    id: string;
    createdAt: Date;
    description: string | null;
    isActive: boolean;
    keyHash: string;
    prefix: string;
    lastUsedAt: Date | null;
}>;
export declare function toggleApiKey(id: string, isActive: boolean): Promise<{
    name: string;
    id: string;
    createdAt: Date;
    description: string | null;
    isActive: boolean;
    keyHash: string;
    prefix: string;
    lastUsedAt: Date | null;
}>;
export declare function validateApiKey(raw: string): Promise<{
    name: string;
    id: string;
    createdAt: Date;
    description: string | null;
    isActive: boolean;
    keyHash: string;
    prefix: string;
    lastUsedAt: Date | null;
} | null>;
//# sourceMappingURL=api-keys.service.d.ts.map